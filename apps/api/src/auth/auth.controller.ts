import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';

class UpdateFcmTokenDto {
  @IsString()
  fcmToken: string;
}

class QueryUsersDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async listUsers(@Query() query: QueryUsersDto) {
    return this.prisma.user.findMany({
      where: {
        ...(query.role ? { role: query.role as any } : {}),
        ...(query.search
          ? {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search } },
              ],
            }
          : {}),
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true, avatarUrl: true },
      take: 50,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('fcm-token')
  async updateFcmToken(@CurrentUser() user: any, @Body() dto: UpdateFcmTokenDto) {
    const existing = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { fcmTokens: true },
    });
    const tokens = existing?.fcmTokens ?? [];
    if (!tokens.includes(dto.fcmToken)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { fcmTokens: { push: dto.fcmToken } },
      });
    }
    return { ok: true };
  }
}
