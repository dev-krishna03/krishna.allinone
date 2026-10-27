import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PolicyDecisionService } from './policy-decision.service';
import { FieldPolicyType } from '@prisma/client';

export interface MaskRule {
  fieldName: string;
  policy: FieldPolicyType;
  maskPattern: string | null;
}

export function applyFieldMasks(data: any, rules: MaskRule[]): any {
  if (!data || rules.length === 0) return data;

  if (Array.isArray(data)) {
    return data.map((item) => applyFieldMasks(item, rules));
  }

  if (typeof data !== 'object') {
    return data;
  }

  const copy = { ...data };

  for (const rule of rules) {
    if (rule.fieldName in copy) {
      if (rule.policy === 'HIDE') {
        delete copy[rule.fieldName];
      } else if (rule.policy === 'MASK') {
        const pattern = rule.maskPattern || 'REDACTED';
        const originalVal = String(copy[rule.fieldName] ?? '');
        if (pattern.includes('#')) {
          // preserve trailing chars if pattern has # format
          const keepCount = (pattern.match(/#/g) || []).length;
          const tail = originalVal.slice(-keepCount);
          copy[rule.fieldName] = pattern.replace(/#+$/, tail);
        } else {
          copy[rule.fieldName] = pattern;
        }
      }
    }
  }

  return copy;
}

@Injectable()
export class FieldSecurityInterceptor implements NestInterceptor {
  constructor(private readonly policyService: PolicyDecisionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const membership = request.membership;
    const resourceType = request.params.resourceType || request.route?.path?.split('/')[3];

    return next.handle().pipe(
      map(async (data) => {
        if (!membership || !resourceType) return data;

        const roleIds = membership.roleAssignments?.map((ra: any) => ra.roleId) || [];
        const policies = await this.policyService.resolveFieldPolicies(
          membership.organizationId,
          roleIds,
          resourceType,
        );

        return applyFieldMasks(data, policies);
      }),
    );
  }
}
