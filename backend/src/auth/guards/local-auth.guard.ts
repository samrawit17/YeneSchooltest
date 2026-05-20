import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  getRequest(context) {
    const request = context.switchToHttp().getRequest();

    if (request.body?.loginIdentifier && !request.body.email) {
      request.body.email = request.body.loginIdentifier;
    }

    return request;
  }
}
