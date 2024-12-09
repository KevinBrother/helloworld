import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Roles } from '../decorators/roles.decorator';
import { MyUnauthorizedException } from '../filters/my.unauthorized.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get(Roles, context.getHandler());
    console.log('roles', roles);
    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user || { roles: [] };
    console.log('user', user);
    const hasRole = roles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new MyUnauthorizedException('你没有权限!!!!');
    }
    return hasRole;
  }
}
