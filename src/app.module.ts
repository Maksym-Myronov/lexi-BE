import { Module } from '@nestjs/common';
import { LoggerModule } from './common/logging/logger.module.js';
import { AppConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [AppConfigModule, LoggerModule, PrismaModule, HealthModule],
})
export class AppModule {}
