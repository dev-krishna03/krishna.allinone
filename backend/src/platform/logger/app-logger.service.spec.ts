import { AppLogger } from './app-logger.service';

describe('AppLogger', () => {
  let logger: AppLogger;

  beforeEach(() => {
    logger = new AppLogger();
  });

  it('should redact sensitive keys such as password, token, authorization, and secret', () => {
    const sensitivePayload = {
      user: 'alice',
      password: 'SuperSecretPassword123!',
      token: 'jwt.token.string',
      authorization: 'Bearer 12345678',
      secret: 'api_secret_key',
      safeField: 'visible_data',
    };

    const redacted = (logger as any).redact(sensitivePayload);

    expect(redacted.user).toBe('alice');
    expect(redacted.safeField).toBe('visible_data');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.authorization).toBe('[REDACTED]');
    expect(redacted.secret).toBe('[REDACTED]');
  });

  it('should recursively redact nested objects', () => {
    const nested = {
      meta: {
        credentials: {
          client_secret: 'nested_secret_val',
        },
      },
    };

    const redacted = (logger as any).redact(nested);
    expect(redacted.meta.credentials.client_secret).toBe('[REDACTED]');
  });
});
