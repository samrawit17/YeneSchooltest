import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateParentDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  occupation?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;
}

export class UpdateParentDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  occupation?: string;
}

export class LinkParentToStudentDto {
  @IsString()
  @IsNotEmpty()
  parentProfileId: string;

  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'])
  relation: string;

  @IsOptional()
  isPrimary?: boolean;

  @IsOptional()
  emergencyContact?: boolean;
}

export class CreateParentAndLinkDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  occupation?: string;

  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'])
  relation: string;

  @IsOptional()
  isPrimary?: boolean;

  @IsOptional()
  emergencyContact?: boolean;
}
