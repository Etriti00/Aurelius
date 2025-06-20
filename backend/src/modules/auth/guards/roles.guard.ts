import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

@Injectable()
export class AuthRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      return false;
    }
    
    // Check if user has subscription with admin features
    const hasAdminAccess = user.subscription?.teamFeatures || 
                          user.subscription?.tier === 'ENTERPRISE';
    
    if (requiredRoles.includes('admin') && hasAdminAccess) {
      return true;
    }
    
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}