import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { createValidationPipe } from './common/validation/validation.pipe.js';
import { AppConfigService } from './config/app-config.service.js';

// Shared by main.ts and e2e tests, so tests run the app exactly as in production.
export function setupApp(app: INestApplication): void {
  const config = app.get(AppConfigService);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({ origin: config.get('CORS_ORIGIN'), credentials: true });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (!config.isProduction) {
    const document = new DocumentBuilder()
      .setTitle('Lexi API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, document),
    );
  }
}
