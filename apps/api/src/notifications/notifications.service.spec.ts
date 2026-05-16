jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  messaging: jest.fn(() => ({ send: jest.fn() })),
}));
import * as admin from 'firebase-admin';

import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../common/prisma/prisma.service';

const makePrisma = () => ({
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  contract: {
    findMany: jest.fn(),
  },
  invoice: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof makePrisma>;
  let mockSend: jest.Mock;

  beforeEach(async () => {
    prisma = makePrisma();
    // Reset apps to empty so the constructor does not attempt Firebase init
    (admin as any).apps = [];

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationsService);

    // Wire up a fresh send mock that admin.messaging() returns
    mockSend = jest.fn();
    (admin.messaging as jest.Mock).mockReturnValue({ send: mockSend });
  });

  afterEach(() => jest.clearAllMocks());

  // ── send ──────────────────────────────────────────────────────────────────

  describe('send', () => {
    const userId = 'user-1';
    const type = 'test_type';
    const title = 'Test title';
    const body = 'Test body';

    it('always creates a DB notification record', async () => {
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.send(userId, type, title, body);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId, type, title, body }),
      });
    });

    it('stores optional data, relatedEntityType and relatedEntityId', async () => {
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });
      const data = { key: 'value' };

      await service.send(userId, type, title, body, data, 'contract', 'contract-1');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          data,
          relatedEntityType: 'contract',
          relatedEntityId: 'contract-1',
        }),
      });
    });

    it('defaults data to {} when not provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.send(userId, type, title, body);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ data: {} }),
      });
    });

    it('does not send FCM when user has no fcmTokens', async () => {
      (admin as any).apps = [{}];
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.send(userId, type, title, body);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('does not send FCM when user is null', async () => {
      (admin as any).apps = [{}];
      prisma.user.findUnique.mockResolvedValue(null);

      await service.send(userId, type, title, body);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('does not send FCM when admin.apps is empty even if user has tokens', async () => {
      (admin as any).apps = [];
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: ['token-1'] });

      await service.send(userId, type, title, body);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('sends FCM for each token when admin is initialized and user has tokens', async () => {
      (admin as any).apps = [{}];
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: ['token-1', 'token-2'] });
      mockSend.mockResolvedValue('message-id');

      await service.send(userId, type, title, body);

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('passes correct payload structure to FCM', async () => {
      (admin as any).apps = [{}];
      const data = { extra: 'info' };
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: ['token-1'] });
      mockSend.mockResolvedValue('message-id');

      await service.send(userId, type, title, body, data, 'invoice', 'inv-1');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'token-1',
          notification: { title, body },
          data: expect.objectContaining({ type, extra: 'info', relatedEntityId: 'inv-1' }),
          android: { priority: 'high' },
          apns: { payload: { aps: { sound: 'default' } } },
        }),
      );
    });

    it('does not update user tokens when all sends succeed', async () => {
      (admin as any).apps = [{}];
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: ['token-1', 'token-2'] });
      mockSend.mockResolvedValue('message-id');

      await service.send(userId, type, title, body);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('prunes token that returns messaging/registration-token-not-registered', async () => {
      (admin as any).apps = [{}];
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: ['valid-token', 'dead-token'] });

      const invalidErr = Object.assign(new Error('token not registered'), {
        code: 'messaging/registration-token-not-registered',
      });
      mockSend
        .mockResolvedValueOnce('msg-id')   // valid-token succeeds
        .mockRejectedValueOnce(invalidErr); // dead-token is pruned

      await service.send(userId, type, title, body);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { fcmTokens: ['valid-token'] },
      });
    });

    it('keeps token when FCM throws an error with a different error code', async () => {
      (admin as any).apps = [{}];
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: ['token-1'] });

      const otherErr = Object.assign(new Error('rate limit'), { code: 'messaging/quota-exceeded' });
      mockSend.mockRejectedValueOnce(otherErr);

      await service.send(userId, type, title, body);

      // token-1 is retained — count matches original — no DB update needed
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('prunes all tokens when every send fails with the invalid-token error', async () => {
      (admin as any).apps = [{}];
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: ['dead-1', 'dead-2'] });

      const invalidErr = Object.assign(new Error('token not registered'), {
        code: 'messaging/registration-token-not-registered',
      });
      mockSend.mockRejectedValue(invalidErr);

      await service.send(userId, type, title, body);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { fcmTokens: [] },
      });
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns notifications ordered by createdAt desc', async () => {
      const notifications = [{ id: 'n1' }, { id: 'n2' }];
      prisma.notification.findMany.mockResolvedValue(notifications);

      const result = await service.findAll('user-1');

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
      expect(result).toBe(notifications);
    });

    it('returns an empty array when user has no notifications', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-1');

      expect(result).toEqual([]);
    });
  });

  // ── markRead ──────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('updates notification isRead=true for the given id and userId', async () => {
      const updated = { id: 'n1', isRead: true };
      prisma.notification.update.mockResolvedValue(updated);

      const result = await service.markRead('n1', 'user-1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'user-1' },
        data: { isRead: true, readAt: expect.any(Date) },
      });
      expect(result).toBe(updated);
    });

    it('sets readAt to a Date close to the current time', async () => {
      prisma.notification.update.mockResolvedValue({});

      const before = Date.now();
      await service.markRead('n1', 'user-1');
      const after = Date.now();

      const call = prisma.notification.update.mock.calls[0][0] as any;
      const readAt: Date = call.data.readAt;
      expect(readAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(readAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  // ── markAllRead ───────────────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('marks all unread notifications as read for the user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true, readAt: expect.any(Date) },
      });
    });

    it('resolves without error when there are no unread notifications', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.markAllRead('user-1')).resolves.toBeUndefined();
    });
  });

  // ── sendContractExpiryWarnings ────────────────────────────────────────────

  describe('sendContractExpiryWarnings', () => {
    it('does not send notifications when no contracts are expiring', async () => {
      prisma.contract.findMany.mockResolvedValue([]);

      await service.sendContractExpiryWarnings();

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('queries only contracts with status hieu_luc', async () => {
      prisma.contract.findMany.mockResolvedValue([]);

      await service.sendContractExpiryWarnings();

      const call = prisma.contract.findMany.mock.calls[0][0] as any;
      expect(call.where.status).toBe('hieu_luc');
    });

    it('applies a date range filter for the next 30 days', async () => {
      prisma.contract.findMany.mockResolvedValue([]);

      await service.sendContractExpiryWarnings();

      const call = prisma.contract.findMany.mock.calls[0][0] as any;
      expect(call.where.endDate.gte).toBeInstanceOf(Date);
      expect(call.where.endDate.lte).toBeInstanceOf(Date);
      expect(call.where.endDate.lte.getTime()).toBeGreaterThan(
        call.where.endDate.gte.getTime(),
      );
    });

    it('sends one notification for a single expiring contract', async () => {
      const contract = { id: 'c-1', landlordId: 'landlord-1' };
      prisma.contract.findMany.mockResolvedValue([contract]);
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.sendContractExpiryWarnings();

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'landlord-1',
          type: 'contract_expiry_warning',
          relatedEntityType: 'contract',
          relatedEntityId: 'c-1',
        }),
      });
    });

    it('sends one notification per expiring contract', async () => {
      const contracts = [
        { id: 'c-1', landlordId: 'landlord-1' },
        { id: 'c-2', landlordId: 'landlord-2' },
        { id: 'c-3', landlordId: 'landlord-1' },
      ];
      prisma.contract.findMany.mockResolvedValue(contracts);
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.sendContractExpiryWarnings();

      expect(prisma.notification.create).toHaveBeenCalledTimes(3);
    });

    it('uses the correct Vietnamese title and body text', async () => {
      const contract = { id: 'c-1', landlordId: 'landlord-1' };
      prisma.contract.findMany.mockResolvedValue([contract]);
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.sendContractExpiryWarnings();

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Hợp đồng sắp hết hạn',
          body: 'Hợp đồng phòng sẽ hết hạn trong 30 ngày',
        }),
      });
    });
  });

  // ── sendInvoiceReminders ──────────────────────────────────────────────────

  describe('sendInvoiceReminders', () => {
    it('does nothing when no overdue invoices exist', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      await service.sendInvoiceReminders();

      expect(prisma.invoice.update).not.toHaveBeenCalled();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('queries invoices with status chua_thanh_toan and dueDate in the past', async () => {
      prisma.invoice.findMany.mockResolvedValue([]);

      await service.sendInvoiceReminders();

      const call = prisma.invoice.findMany.mock.calls[0][0] as any;
      expect(call.where.status).toBe('chua_thanh_toan');
      expect(call.where.dueDate.lt).toBeInstanceOf(Date);
    });

    it('updates a single overdue invoice to status qua_han', async () => {
      const invoice = { id: 'inv-1', tenantId: 'tenant-1', billingMonth: '2026-04' };
      prisma.invoice.findMany.mockResolvedValue([invoice]);
      prisma.invoice.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.sendInvoiceReminders();

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'qua_han' },
      });
    });

    it('sends a notification to the tenant of the overdue invoice', async () => {
      const invoice = { id: 'inv-1', tenantId: 'tenant-1', billingMonth: '2026-04' };
      prisma.invoice.findMany.mockResolvedValue([invoice]);
      prisma.invoice.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.sendInvoiceReminders();

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'tenant-1',
          type: 'invoice_overdue',
          relatedEntityType: 'invoice',
          relatedEntityId: 'inv-1',
        }),
      });
    });

    it('includes billingMonth in the notification body', async () => {
      const invoice = { id: 'inv-1', tenantId: 'tenant-1', billingMonth: '2026-04' };
      prisma.invoice.findMany.mockResolvedValue([invoice]);
      prisma.invoice.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.sendInvoiceReminders();

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Hóa đơn quá hạn',
          body: 'Hóa đơn tháng 2026-04 đã quá hạn thanh toán',
        }),
      });
    });

    it('updates and notifies for each of multiple overdue invoices', async () => {
      const invoices = [
        { id: 'inv-1', tenantId: 'tenant-1', billingMonth: '2026-03' },
        { id: 'inv-2', tenantId: 'tenant-2', billingMonth: '2026-04' },
      ];
      prisma.invoice.findMany.mockResolvedValue(invoices);
      prisma.invoice.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.sendInvoiceReminders();

      expect(prisma.invoice.update).toHaveBeenCalledTimes(2);
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    });

    it('updates invoice status before sending the notification', async () => {
      const invoice = { id: 'inv-1', tenantId: 'tenant-1', billingMonth: '2026-04' };
      prisma.invoice.findMany.mockResolvedValue([invoice]);

      const callOrder: string[] = [];
      prisma.invoice.update.mockImplementation(async () => {
        callOrder.push('invoice.update');
      });
      prisma.notification.create.mockImplementation(async () => {
        callOrder.push('notification.create');
      });
      prisma.user.findUnique.mockResolvedValue({ fcmTokens: [] });

      await service.sendInvoiceReminders();

      expect(callOrder).toEqual(['invoice.update', 'notification.create']);
    });
  });
});
