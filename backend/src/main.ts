import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

const INSECURE_JWT_SECRETS = new Set([
  'your-super-secret-jwt-key-change-this-in-production',
  'dev-jwt-secret-change-me',
  'secret',
  'changeme',
]);

function describeDatabaseTarget(databaseUrl?: string) {
  if (!databaseUrl) {
    return 'DATABASE_URL is not set';
  }

  try {
    const parsed = new URL(databaseUrl);
    const dbName = parsed.pathname.replace(/^\//, '') || '<unknown>';
    return `${parsed.hostname}:${parsed.port || '5432'}/${dbName}`;
  } catch {
    return 'DATABASE_URL is set but could not be parsed';
  }
}

function requireProductionSecrets() {
  const jwtSecret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
  }

  if (isProduction && (jwtSecret.length < 32 || INSECURE_JWT_SECRETS.has(jwtSecret))) {
    throw new Error('Refusing to start with an insecure JWT_SECRET in production');
  }
}

function parseAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:8000';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function applySecurityHeaders(app: NestExpressApplication) {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');

    next();
  });
}

async function bootstrap() {
  requireProductionSecrets();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS as early as possible so even early 4xx (e.g. JSON parse errors)
  // include the CORS headers and browser clients can read the response.
  const allowedOrigins = parseAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS origin denied'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    optionsSuccessStatus: 204,
  });

  app.set('trust proxy', process.env.TRUST_PROXY ?? 1);
  app.use(cookieParser());
  applySecurityHeaders(app);
  app.useStaticAssets(join(process.cwd(), 'public'), {
    dotfiles: 'deny',
    index: false,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Increase body size limit for file uploads (base64 encoded images/docs)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  const port = process.env.PORT ?? 8001;
  await app.listen(port);
  console.log(`[startup] Backend listening on port ${port}`);
  console.log(
    `[startup] Database target: ${describeDatabaseTarget(process.env.DATABASE_POOL_URL || process.env.DATABASE_URL)}`,
  );
  console.log(
    '[startup] Expected Docker database for local development: localhost:5433/lemarisms',
  );
}
bootstrap();
