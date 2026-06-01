import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'loginIdentifier', // Can be username, email, or phone
      passReqToCallback: true,
    });
  }

  async validate(req: any, loginIdentifier: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(
      loginIdentifier,
      password,
      req?.body?.schoolId,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
