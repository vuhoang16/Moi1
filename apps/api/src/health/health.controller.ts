import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../common/prisma/prisma.service';

const pkg = require('../../package.json');

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check(@Res() res: Response) {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    const version: string = pkg.version ?? '1.0.0';

    let dbStatus: 'ok' | 'error' = 'ok';
    let dbResponseTimeMs = 0;

    try {
      const start = Date.now();
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000),
        ),
      ]);
      dbResponseTimeMs = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }

    const supabaseStatus: 'ok' | 'error' =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
        ? 'ok'
        : 'error';

    const allOk = dbStatus === 'ok' && supabaseStatus === 'ok';
    const overallStatus: 'ok' | 'degraded' | 'error' = dbStatus === 'error'
      ? 'error'
      : !allOk
        ? 'degraded'
        : 'ok';

    const httpStatus =
      overallStatus === 'error' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;

    return res.status(httpStatus).json({
      status: overallStatus,
      timestamp,
      uptime,
      version,
      services: {
        database: {
          status: dbStatus,
          responseTimeMs: dbResponseTimeMs,
        },
        supabase: {
          status: supabaseStatus,
        },
      },
    });
  }
}
