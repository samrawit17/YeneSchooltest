import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

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
  // Logging removed for production
}
bootstrap();
