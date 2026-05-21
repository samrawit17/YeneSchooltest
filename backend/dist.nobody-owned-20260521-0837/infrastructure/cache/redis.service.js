"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_net_1 = require("node:net");
let RedisService = RedisService_1 = class RedisService {
    configService;
    logger = new common_1.Logger(RedisService_1.name);
    redisUrl;
    warnedAuthNotRequired = false;
    socket;
    buffer = '';
    connectPromise;
    pendingCommands = [];
    isReady = false;
    constructor(configService) {
        this.configService = configService;
        this.redisUrl = this.configService.get('REDIS_URL') || undefined;
    }
    async onModuleDestroy() {
        this.disconnect();
    }
    async get(key) {
        const result = await this.execute(['GET', key]);
        return typeof result === 'string' || result === null ? result : null;
    }
    async set(key, value, ttlSeconds) {
        await this.execute(['SET', key, value, 'EX', String(ttlSeconds)]);
    }
    async del(...keys) {
        if (keys.length === 0) {
            return;
        }
        await this.execute(['DEL', ...keys]);
    }
    async incr(key) {
        const result = await this.execute(['INCR', key]);
        return typeof result === 'number' ? result : null;
    }
    async expire(key, ttlSeconds) {
        await this.execute(['EXPIRE', key, String(ttlSeconds)]);
    }
    async ttl(key) {
        const result = await this.execute(['TTL', key]);
        return typeof result === 'number' ? result : null;
    }
    async execute(args) {
        if (!this.redisUrl) {
            return null;
        }
        try {
            await this.connect();
            return (await this.sendCommand(args));
        }
        catch (error) {
            this.logger.warn(`Redis command failed (${args[0]}): ${error}`);
            this.disconnect();
            return null;
        }
    }
    async connect() {
        if (this.isReady) {
            return;
        }
        if (this.connectPromise) {
            return this.connectPromise;
        }
        this.connectPromise = this.createConnection();
        try {
            await this.connectPromise;
        }
        finally {
            this.connectPromise = undefined;
        }
    }
    async createConnection() {
        if (!this.redisUrl) {
            return;
        }
        const parsedUrl = new URL(this.redisUrl);
        const port = parsedUrl.port ? Number(parsedUrl.port) : 6379;
        const host = parsedUrl.hostname;
        const username = parsedUrl.username || undefined;
        const password = parsedUrl.password || undefined;
        const db = parsedUrl.pathname.replace('/', '') || undefined;
        await new Promise((resolve, reject) => {
            const socket = new node_net_1.Socket();
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
            }
            catch (error) {
                if (this.isAuthNotRequiredError(error)) {
                    if (!this.warnedAuthNotRequired) {
                        this.logger.warn('Redis password provided, but the server does not require authentication. Continuing without AUTH.');
                        this.warnedAuthNotRequired = true;
                    }
                }
                else {
                    throw error;
                }
            }
        }
        if (db) {
            await this.sendCommand(['SELECT', db]);
        }
        this.isReady = true;
    }
    bindSocketEvents(socket) {
        socket.on('data', (chunk) => {
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
    disconnect(reason) {
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
    sendCommand(args) {
        if (!this.socket) {
            return Promise.reject(new Error('Redis socket is not connected'));
        }
        return new Promise((resolve, reject) => {
            this.pendingCommands.push({ resolve, reject });
            this.socket?.write(this.encodeCommand(args));
        });
    }
    encodeCommand(args) {
        const lines = [`*${args.length}`];
        for (const arg of args) {
            lines.push(`$${Buffer.byteLength(arg, 'utf8')}`);
            lines.push(arg);
        }
        return `${lines.join('\r\n')}\r\n`;
    }
    flushResponses() {
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
    isAuthNotRequiredError(error) {
        if (!(error instanceof Error)) {
            return false;
        }
        return (error.message.includes('AUTH <password> called without any password configured') ||
            error.message.includes('AUTH <username> <password> called without any password configured'));
    }
    parseResp(input, offset) {
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
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map