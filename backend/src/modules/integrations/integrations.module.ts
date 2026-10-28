import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { OAuthVaultService } from './oauth-vault.service';
import { TokenEncryptionService } from './crypto/token-encryption.service';
import { OutboxModule } from '../../platform/outbox/outbox.module';

@Module({
  imports: [OutboxModule],
  controllers: [IntegrationsController],
  providers: [OAuthVaultService, TokenEncryptionService],
  exports: [OAuthVaultService, TokenEncryptionService],
})
export class IntegrationsModule {}
