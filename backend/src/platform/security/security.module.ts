import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PermissionRegistryService } from './permissions/permission-registry.service';
import { PermissionCatalogController } from './permissions/permission-catalog.controller';
import { PolicyDecisionService } from './policy/policy-decision.service';
import { SecurityPolicyController } from './policy/security-policy.controller';
import { PermissionGuard } from './policy/guards/permission.guard';
import { FieldSecurityInterceptor } from './policy/field-security.interceptor';

@Global()
@Module({
  imports: [DatabaseModule, OutboxModule],
  controllers: [PermissionCatalogController, SecurityPolicyController],
  providers: [
    PermissionRegistryService,
    PolicyDecisionService,
    PermissionGuard,
    FieldSecurityInterceptor,
  ],
  exports: [
    PermissionRegistryService,
    PolicyDecisionService,
    PermissionGuard,
    FieldSecurityInterceptor,
  ],
})
export class SecurityModule {}
