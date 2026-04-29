import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as admin from 'firebase-admin';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {
    if (!admin.apps.length && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PRIVATE_KEY.length > 50) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async send(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    relatedEntityType?: string,
    relatedEntityId?: string,
  ) {
    await this.prisma.notification.create({
      data: { userId, type, title, body, data: data ?? {}, relatedEntityType, relatedEntityId },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmTokens: true },
    });

    if (!user?.fcmTokens.length) return;

    if (!admin.apps.length) return;

    const validTokens: string[] = [];
    for (const token of user.fcmTokens) {
      try {
        await admin.messaging().send({
          token,
          notification: { title, body },
          data: { type, ...(data ?? {}), ...(relatedEntityId && { relatedEntityId }) },
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } },
        });
        validTokens.push(token);
      } catch (err: any) {
        if (err.code !== 'messaging/registration-token-not-registered') {
          validTokens.push(token);
        }
      }
    }

    if (validTokens.length !== user.fcmTokens.length) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { fcmTokens: validTokens },
      });
    }
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendContractExpiryWarnings() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiring = await this.prisma.contract.findMany({
      where: {
        status: 'hieu_luc',
        endDate: {
          gte: today,
          lte: thirtyDaysFromNow,
        },
      },
    });

    for (const contract of expiring) {
      await this.send(
        contract.landlordId,
        'contract_expiry_warning',
        'Hợp đồng sắp hết hạn',
        `Hợp đồng phòng sẽ hết hạn trong 30 ngày`,
        {},
        'contract',
        contract.id,
      );
    }

    this.logger.log(`Sent ${expiring.length} contract expiry warnings`);
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async sendInvoiceReminders() {
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'chua_thanh_toan',
        dueDate: { lt: new Date() },
      },
      select: { id: true, tenantId: true, billingMonth: true },
    });

    for (const invoice of overdueInvoices) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'qua_han' },
      });
      await this.send(
        invoice.tenantId,
        'invoice_overdue',
        'Hóa đơn quá hạn',
        `Hóa đơn tháng ${invoice.billingMonth} đã quá hạn thanh toán`,
        {},
        'invoice',
        invoice.id,
      );
    }
  }
}
