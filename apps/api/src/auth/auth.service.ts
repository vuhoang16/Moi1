import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createClient } from '@supabase/supabase-js';
import { PrismaService } from '../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email đã được sử dụng');

    let userId = 'dummy-' + Date.now();
    
    // Local dev bypass
    if (process.env.SUPABASE_URL !== 'https://dummy.supabase.co') {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });
      if (error) throw new BadRequestException(error.message);
      userId = data.user.id;
    }

    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone,
        role: dto.role as UserRole,
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    // Local dev bypass
    if (process.env.SUPABASE_URL === 'https://dummy.supabase.co') {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (!user) throw new UnauthorizedException('Tài khoản không tồn tại trong DB local');
      return this.issueTokens(user.id, user.email, user.role);
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });
    if (error) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');

    const user = await this.prisma.user.findUnique({
      where: { id: data.user.id },
    });
    if (!user) throw new UnauthorizedException();

    return this.issueTokens(user.id, user.email, user.role);
  }

  async loginWithGoogle(supabaseAccessToken: string) {
    const { data, error } = await this.supabase.auth.getUser(supabaseAccessToken);
    if (error || !data.user) throw new UnauthorizedException();

    let user = await this.prisma.user.findUnique({
      where: { id: data.user.id },
    });

    return { user, isNewUser: !user, supabaseUser: data.user };
  }

  async completeGoogleProfile(
    userId: string,
    email: string,
    fullName: string,
    phone: string,
    role: UserRole,
  ) {
    const user = await this.prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email, fullName, phone, role },
      update: {},
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as { sub: string; email: string; role: string };
      return this.issueTokens(payload.sub, payload.email, payload.role as UserRole);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  private issueTokens(userId: string, email: string, role: UserRole) {
    const payload = { sub: userId, email, role };
    return {
      accessToken: this.jwt.sign(payload, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
        secret: process.env.JWT_SECRET,
      }),
      refreshToken: this.jwt.sign(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
        secret: process.env.JWT_REFRESH_SECRET,
      }),
    };
  }
}
