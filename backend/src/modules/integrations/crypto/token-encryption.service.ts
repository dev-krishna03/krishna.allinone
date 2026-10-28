import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class TokenEncryptionService {
  private readonly logger = new Logger(TokenEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    // 32-byte key derived from environment or secure fallback
    const secret =
      process.env.INTEGRATION_CIPHER_SECRET ||
      process.env.JWT_SECRET ||
      'business_os_super_secret_cipher_key_default_32_bytes!';
    this.key = crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Encrypts plaintext string using AES-256-GCM with a randomized 12-byte IV.
   * Returns ciphertext, IV, and 16-byte authentication tag in hex.
   */
  encrypt(plaintext: string): { ciphertext: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const tag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag,
    };
  }

  /**
   * Decrypts ciphertext using AES-256-GCM. Verifies authentication tag for integrity.
   */
  decrypt(ciphertext: string, ivHex: string, tagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(tag);

    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  /**
   * Redacts sensitive tokens from diagnostic logging.
   */
  redact(token?: string | null): string {
    if (!token) return '[EMPTY]';
    if (token.length <= 8) return '***';
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }
}
