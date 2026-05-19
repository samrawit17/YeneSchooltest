import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS as early as possible so even early 4xx (e.g. JSON parse errors)
  // include the CORS headers and browser clients can read the response.
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    optionsSuccessStatus: 204,
  });

  app.set('trust proxy', process.env.TRUST_PROXY ?? 1);
  app.use(cookieParser());
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Increase body size limit for file uploads (base64 encoded images/docs)
  app.useBodyParser('json', { limit: '10mb' });

  const port = process.env.PORT ?? 5000;
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
