import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLogger implements LoggerService {
  private redact(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const sensitiveKeys = ['password', 'secret', 'token', 'authorization', 'cookie', 'credit_card'];
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        copy[key] = '[REDACTED]';
      } else if (typeof copy[key] === 'object') {
        copy[key] = this.redact(copy[key]);
      }
    }
    return copy;
  }

  log(message: any, ...optionalParams: any[]) {
    console.log(JSON.stringify({ level: 'INFO', time: new Date().toISOString(), message, context: this.redact(optionalParams) }));
  }

  error(message: any, ...optionalParams: any[]) {
    console.error(JSON.stringify({ level: 'ERROR', time: new Date().toISOString(), message, context: this.redact(optionalParams) }));
  }

  warn(message: any, ...optionalParams: any[]) {
    console.warn(JSON.stringify({ level: 'WARN', time: new Date().toISOString(), message, context: this.redact(optionalParams) }));
  }

  debug(message: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({ level: 'DEBUG', time: new Date().toISOString(), message, context: this.redact(optionalParams) }));
    }
  }

  verbose(message: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify({ level: 'VERBOSE', time: new Date().toISOString(), message, context: this.redact(optionalParams) }));
    }
  }
}
