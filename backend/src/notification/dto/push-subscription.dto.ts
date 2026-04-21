import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PushSubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

class PushSubscriptionBodyDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsOptional()
  expirationTime?: number | null;

  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys: PushSubscriptionKeysDto;
}

export class SavePushSubscriptionDto {
  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionBodyDto)
  subscription: PushSubscriptionBodyDto;
}

export class RemovePushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;
}
