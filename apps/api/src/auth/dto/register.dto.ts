import { IsEmail, IsEnum, IsString, MinLength, Matches } from 'class-validator';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @Matches(/^(0|\+84)[0-9]{8,9}$/, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @IsEnum(UserRole)
  role: UserRole;
}
