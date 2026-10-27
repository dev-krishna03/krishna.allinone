import { Module } from '@nestjs/common';
import { SuperAdminService } from './admin.service';
import { SuperAdminController } from './admin.controller';

@Module({
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
