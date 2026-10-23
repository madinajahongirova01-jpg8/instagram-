import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { PASSWORD_MAX, USERNAME_REGEX } from '@insta/shared';
import { USERNAME_RULE_MESSAGE } from '../../auth/dto/auth.dto';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CurrentPasswordDto {
  @ApiProperty({ description: 'Текущий пароль для подтверждения' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX)
  password: string;
}

export class ChangeUsernameDto {
  @ApiProperty({ example: 'new.name' })
  @Transform(trimLower)
  @IsString()
  @Matches(USERNAME_REGEX, { message: USERNAME_RULE_MESSAGE })
  username: string;
}

export class ChangeEmailDto extends CurrentPasswordDto {
  @ApiProperty({ example: 'new@example.com' })
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email: string;
}
