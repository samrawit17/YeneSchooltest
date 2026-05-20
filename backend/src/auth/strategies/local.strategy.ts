import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Can be email, username, or phone
      passReqToCallback: true,
    });
  }

  async validate(
    req: { body?: { email?: string; loginIdentifier?: string } },
    email: string,
    password: string,
  ): Promise<any> {
    const identifier = email || req.body?.loginIdentifier;

    if (!identifier) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.authService.validateUser(identifier, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
