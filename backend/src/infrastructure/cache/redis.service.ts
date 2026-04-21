import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'node:net';

type PendingCommand = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type ParsedResp = { value: string | number | null; nextOffset: number } | null;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redisUrl?: string;
  private warnedAuthNotRequired = false;

  private socket?: Socket;
  private buffer = '';
  private connectPromise?: Promise<void>;
  private pendingCommands: PendingCommand[] = [];
  private isReady = false;

  constructor(private readonly configService: ConfigService) {
    this.redisUrl = this.configService.get<string>('REDIS_URL') || undefined;
  }

  async onModuleDestroy(): Promise<void> {
    this.disconnect();
  }

  async get(key: string): Promise<string | null> {
    const result = await this.execute<string | null>(['GET', key]);
    return typeof result === 'string' || result === null ? result : null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.execute(['SET', key, value, 'EX', String(ttlSeconds)]);
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await this.execute(['DEL', ...keys]);
  }

  async incr(key: string): Promise<number | null> {
    const result = await this.execute<number>(['INCR', key]);
    return typeof result === 'number' ? result : null;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.execute(['EXPIRE', key, String(ttlSeconds)]);
  }

  async ttl(key: string): Promise<number | null> {
    const result = await this.execute<number>(['TTL', key]);
    return typeof result === 'number' ? result : null;
  }

  private async execute<T>(args: string[]): Promise<T | null> {
    if (!this.redisUrl) {
      return null;
    }

    try {
      await this.connect();
      return (await this.sendCommand(args)) as T;
    } catch (error) {
      this.logger.warn(`Redis command failed (${args[0]}): ${error}`);
      this.disconnect();
      return null;
    }
  }

  private async connect(): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.createConnection();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = undefined;
    }
  }

  private async createConnection(): Promise<void> {
    if (!this.redisUrl) {
      return;
    }

    const parsedUrl = new URL(this.redisUrl);
    const port = parsedUrl.port ? Number(parsedUrl.port) : 6379;
    const host = parsedUrl.hostname;
    const username = parsedUrl.username || undefined;
    const password = parsedUrl.password || undefined;
    const db = parsedUrl.pathname.replace('/', '') || undefined;

    await new Promise<void>((resolve, reject) => {
      const socket = new Socket();

      const cleanup = () => {
        socket.removeAllListeners('connect');
        socket.removeAllListeners('error');
      };

      socket.once('connect', () => {
        cleanup();
        this.socket = socket;
        this.buffer = '';
        this.bindSocketEvents(socket);
        resolve();
      });

      socket.once('error', (error) => {
        cleanup();
        reject(error);
      });

      socket.connect(port, host);
    });

    if (password) {
      const authArgs = username
        ? ['AUTH', username, password]
        : ['AUTH', password];

      try {
        await this.sendCommand(authArgs);
      } catch (error) {
        if (this.isAuthNotRequiredError(error)) {
          if (!this.warnedAuthNotRequired) {
            this.logger.warn(
              'Redis password provided, but the server does not require authentication. Continuing without AUTH.',
            );
            this.warnedAuthNotRequired = true;
          }
        } else {
          throw error;
        }
      }
    }

    if (db) {
      await this.sendCommand(['SELECT', db]);
    }

    this.isReady = true;
  }

  private bindSocketEvents(socket: Socket): void {
    socket.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString('utf8');
      this.flushResponses();
    });

    socket.on('close', () => {
      this.disconnect(new Error('Redis connection closed'));
    });

    socket.on('error', (error) => {
      this.disconnect(error);
    });
  }

  private disconnect(reason?: Error): void {
    if (reason) {
      while (this.pendingCommands.length > 0) {
        const pending = this.pendingCommands.shift();
        pending?.reject(reason);
      }
    }

    this.isReady = false;
    this.buffer = '';

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = undefined;
    }
  }

  private sendCommand(args: string[]): Promise<unknown> {
    if (!this.socket) {
      return Promise.reject(new Error('Redis socket is not connected'));
    }

    return new Promise((resolve, reject) => {
      this.pendingCommands.push({ resolve, reject });
      this.socket?.write(this.encodeCommand(args));
    });
  }

  private encodeCommand(args: string[]): string {
    const lines = [`*${args.length}`];
    for (const arg of args) {
      lines.push(`$${Buffer.byteLength(arg, 'utf8')}`);
      lines.push(arg);
    }
    return `${lines.join('\r\n')}\r\n`;
  }

  private flushResponses(): void {
    while (this.pendingCommands.length > 0) {
      const parsed = this.parseResp(this.buffer, 0);
      if (!parsed) {
        return;
      }

      const pending = this.pendingCommands.shift();
      this.buffer = this.buffer.slice(parsed.nextOffset);

      if (typeof parsed.value === 'string' && parsed.value.startsWith('ERR ')) {
        pending?.reject(new Error(parsed.value));
        continue;
      }

      pending?.resolve(parsed.value);
    }
  }

  private isAuthNotRequiredError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      error.message.includes(
        'AUTH <password> called without any password configured',
      ) ||
      error.message.includes(
        'AUTH <username> <password> called without any password configured',
      )
    );
  }

  private parseResp(input: string, offset: number): ParsedResp {
    if (offset >= input.length) {
      return null;
    }

    const type = input[offset];
    const lineEnd = input.indexOf('\r\n', offset);

    if (lineEnd === -1) {
      return null;
    }

    const payload = input.slice(offset + 1, lineEnd);

    if (type === '+' || type === '-') {
      return { value: payload, nextOffset: lineEnd + 2 };
    }

    if (type === ':') {
      return { value: Number(payload), nextOffset: lineEnd + 2 };
    }

    if (type === '$') {
      const length = Number(payload);
      if (length === -1) {
        return { value: null, nextOffset: lineEnd + 2 };
      }

      const start = lineEnd + 2;
      const end = start + length;
      if (input.length < end + 2) {
        return null;
      }

      return { value: input.slice(start, end), nextOffset: end + 2 };
    }

    return null;
  }
}
