import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_CHECK_KEY,
  RequiredPermissionMetadata,
} from '../decorators/require-permission.decorator';
import { PolicyDecisionService } from '../policy-decision.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyService: PolicyDecisionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermissionMetadata>(
      PERMISSION_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const membership = request.membership;

    if (!membership) {
      throw new ForbiddenException('Organization membership context missing');
    }

    const recordId = request.params.id || request.params.recordId;
    const recordOwnerId = request.body?.ownerId || request.query?.ownerId;
    const recordTeamId = request.body?.teamId || request.query?.teamId;

    const evaluation = await this.policyService.evaluateAccess({
      orgId: membership.organizationId,
      memberId: membership.id,
      module: requiredPermission.module,
      resource: requiredPermission.resource,
      action: requiredPermission.action,
      recordId,
      recordOwnerId,
      recordTeamId,
    });

    if (!evaluation.permit) {
      throw new ForbiddenException(evaluation.reason);
    }

    // Attach evaluation to request for downstream handlers or audit
    request.policyEvaluation = evaluation;

    return true;
  }
}
