import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  FULL_NAME_MAX,
  PASSWORD_MAX,
  PASSWORD_MIN,
  PASSWORD_REGEX,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX,
} from '@insta/shared';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const PASSWORD_RULE_MESSAGE = `Password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters and contain a letter and a digit`;
export const USERNAME_RULE_MESSAGE =
  'Username may contain lowercase latin letters, digits, dots and underscores (3-30), no leading/trailing or double dots';

export class PasswordField {
  @ApiProperty({ example: 'Secret123', minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE })
  password: string;
}

export class RegisterDto extends PasswordField {
  @ApiProperty({ example: 'madina@example.com' })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'madina.dev', minLength: USERNAME_MIN, maxLength: USERNAME_MAX })
  @Transform(trimLower)
  @IsString()
  @Matches(USERNAME_REGEX, { message: USERNAME_RULE_MESSAGE })
  username: string;

  @ApiProperty({ example: 'Madina Jahongirova', maxLength: FULL_NAME_MAX })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(FULL_NAME_MAX)
  fullName: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Email или username', example: 'madina.dev' })
  @Transform(trimLower)
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  login: string;

  @ApiProperty({ example: 'Secret123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  currentPassword: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'madina@example.com' })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class TokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;
}

export class ResetPasswordDto extends TokenDto {
  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE })
  newPassword: string;
}
