import { Module } from '@nestjs/common';
import { ConversionModule } from "./conversion/conversion.module";
import { HealthModule } from './health/health.module'

@Module({
  imports: [ConversionModule, HealthModule],
})
export class AppModule {}