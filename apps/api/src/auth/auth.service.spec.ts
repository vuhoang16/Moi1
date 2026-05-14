import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';

const mockCreateUser = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: { createUser: mockCreateUser },
      signInWithPassword: mockSignInWithPassword,
      getUser: mockGetUser,
    },
  })),
}));

const makePrisma = () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
});

const makeJwt = () => ({
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
});

const baseUser = {
  id: 'user-1',
  email: 'test@example.com',
  fullName: 'Nguyen Van A',
  phone: '0912345678',
  role: UserRole.nguoi_thue,
};

const registerDto = {
  email: 'test@example.com',
  password: 'password123',
  fullName: 'Nguyen Van A',
  phone: '0912345678',
  role: UserRole.nguoi_thue,
};

const loginDto = { email: 'test@example.com', password: 'password123' };

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof makePrisma>;
  let jwt: ReturnType<typeof makeJwt>;

  const buildModule = async () => {
    prisma = makePrisma();
    jwt = makeJwt();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = module.get(AuthService);
  };

  afterEach(() => jest.clearAllMocks());

  // ── register ───────────────────────────────────────────────────────────────

  describe('register — local dev bypass', () => {
    beforeEach(async () => {
      process.env.SUPABASE_URL = 'https://dummy.supabase.co';
      await buildModule();
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates user with dummy id and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser);

      const result = await service.register(registerDto);

      expect(mockCreateUser).not.toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: registerDto.email,
            fullName: registerDto.fullName,
          }),
        }),
      );
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });

    it('uses dummy-prefixed id in bypass mode', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser);

      await service.register(registerDto);

      const callArg = prisma.user.create.mock.calls[0][0] as any;
      expect(callArg.data.id).toMatch(/^dummy-\d+$/);
    });
  });

  describe('register — real Supabase', () => {
    beforeEach(async () => {
      process.env.SUPABASE_URL = 'https://real.supabase.co';
      await buildModule();
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when Supabase returns an error', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({ data: null, error: { message: 'Supabase error' } });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates user with Supabase uid and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({ data: { user: { id: 'supa-uid-1' } }, error: null });
      prisma.user.create.mockResolvedValue({ ...baseUser, id: 'supa-uid-1' });

      const result = await service.register(registerDto);

      expect(mockCreateUser).toHaveBeenCalledWith({
        email: registerDto.email,
        password: registerDto.password,
        email_confirm: true,
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id: 'supa-uid-1' }) }),
      );
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login — local dev bypass', () => {
    beforeEach(async () => {
      process.env.SUPABASE_URL = 'https://dummy.supabase.co';
      await buildModule();
    });

    it('throws UnauthorizedException when user not found in local DB', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it('returns tokens when user exists in local DB', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);

      const result = await service.login(loginDto);

      expect(mockSignInWithPassword).not.toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });
  });

  describe('login — real Supabase', () => {
    beforeEach(async () => {
      process.env.SUPABASE_URL = 'https://real.supabase.co';
      await buildModule();
    });

    it('throws UnauthorizedException when Supabase signIn fails', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user not in DB after Supabase login', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'supa-uid-1' } }, error: null });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens on successful login', async () => {
      mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'supa-uid-1' } }, error: null });
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, id: 'supa-uid-1' });

      const result = await service.login(loginDto);

      expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: loginDto.email, password: loginDto.password });
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });
  });

  // ── loginWithGoogle ────────────────────────────────────────────────────────

  describe('loginWithGoogle', () => {
    beforeEach(async () => {
      process.env.SUPABASE_URL = 'https://real.supabase.co';
      await buildModule();
    });

    it('throws UnauthorizedException when Supabase returns an error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Bad token' } });

      await expect(service.loginWithGoogle('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when Supabase returns no user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      await expect(service.loginWithGoogle('token-no-user')).rejects.toThrow(UnauthorizedException);
    });

    it('returns isNewUser=true when user not yet in DB', async () => {
      const supaUser = { id: 'supa-google-1', email: 'google@example.com' };
      mockGetUser.mockResolvedValue({ data: { user: supaUser }, error: null });
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.loginWithGoogle('google-token');

      expect(result.isNewUser).toBe(true);
      expect(result.user).toBeNull();
      expect(result.supabaseUser).toEqual(supaUser);
    });

    it('returns isNewUser=false when user already in DB', async () => {
      const supaUser = { id: 'supa-google-1', email: 'google@example.com' };
      mockGetUser.mockResolvedValue({ data: { user: supaUser }, error: null });
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, id: 'supa-google-1' });

      const result = await service.loginWithGoogle('google-token');

      expect(result.isNewUser).toBe(false);
      expect(result.user).toMatchObject({ id: 'supa-google-1' });
    });
  });

  // ── completeGoogleProfile ──────────────────────────────────────────────────

  describe('completeGoogleProfile', () => {
    beforeEach(async () => {
      process.env.SUPABASE_URL = 'https://real.supabase.co';
      await buildModule();
    });

    it('upserts user and returns tokens', async () => {
      prisma.user.upsert.mockResolvedValue(baseUser);

      const result = await service.completeGoogleProfile(
        'supa-google-1', 'google@example.com', 'Nguyen Van A', '0912345678', UserRole.nguoi_thue,
      );

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { id: 'supa-google-1' },
        create: { id: 'supa-google-1', email: 'google@example.com', fullName: 'Nguyen Van A', phone: '0912345678', role: UserRole.nguoi_thue },
        update: {},
      });
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    beforeEach(async () => {
      process.env.SUPABASE_URL = 'https://real.supabase.co';
      process.env.JWT_REFRESH_SECRET = 'refresh-secret';
      await buildModule();
    });

    it('throws UnauthorizedException when jwt.verify throws', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('returns new token pair for a valid refresh token', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', email: 'test@example.com', role: UserRole.nguoi_thue });

      const result = await service.refresh('valid-refresh-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', { secret: 'refresh-secret' });
      expect(result).toEqual({ accessToken: 'signed-token', refreshToken: 'signed-token' });
    });

    it('signs tokens with payload from verified refresh token', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-42', email: 'owner@example.com', role: UserRole.chu_nha });

      await service.refresh('some-token');

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-42', email: 'owner@example.com', role: UserRole.chu_nha }),
        expect.anything(),
      );
    });
  });

  // ── issueTokens (contract) ─────────────────────────────────────────────────

  describe('issueTokens — sign contract', () => {
    beforeEach(async () => {
      process.env.SUPABASE_URL = 'https://dummy.supabase.co';
      process.env.JWT_SECRET = 'access-secret';
      process.env.JWT_REFRESH_SECRET = 'refresh-secret';
      process.env.JWT_ACCESS_EXPIRES_IN = '15m';
      process.env.JWT_REFRESH_EXPIRES_IN = '30d';
      await buildModule();
    });

    it('signs with correct secrets and expiries', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser);

      await service.register(registerDto);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: baseUser.id, email: baseUser.email, role: baseUser.role }),
        { expiresIn: '15m', secret: 'access-secret' },
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: baseUser.id }),
        { expiresIn: '30d', secret: 'refresh-secret' },
      );
    });

    it('falls back to default expiries when env vars are unset', async () => {
      delete process.env.JWT_ACCESS_EXPIRES_IN;
      delete process.env.JWT_REFRESH_EXPIRES_IN;
      await buildModule();

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser);

      await service.register(registerDto);

      expect(jwt.sign).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ expiresIn: '15m' }));
      expect(jwt.sign).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ expiresIn: '30d' }));
    });
  });
});
