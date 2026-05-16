import { Test } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const makePrisma = () => ({
  chatConversation: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  chatMessage: {
    findMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('ChatService', () => {
  let service: ChatService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── canAccessConversation ─────────────────────────────────────────────────

  describe('canAccessConversation', () => {
    const conv = { landlordId: 'landlord-1', tenantId: 'tenant-1' };

    it('returns true for landlord', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);
      expect(await service.canAccessConversation('conv-1', 'landlord-1')).toBe(true);
    });

    it('returns true for tenant', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);
      expect(await service.canAccessConversation('conv-1', 'tenant-1')).toBe(true);
    });

    it('returns false for unrelated user', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);
      expect(await service.canAccessConversation('conv-1', 'intruder')).toBe(false);
    });

    it('returns false when conversation does not exist', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(null);
      expect(await service.canAccessConversation('conv-999', 'landlord-1')).toBe(false);
    });
  });

  // ── getConversations ──────────────────────────────────────────────────────

  describe('getConversations', () => {
    it('queries conversations where user is landlord or tenant', async () => {
      prisma.chatConversation.findMany.mockResolvedValue([]);

      await service.getConversations('user-1');

      expect(prisma.chatConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ landlordId: 'user-1' }, { tenantId: 'user-1' }] },
        }),
      );
    });

    it('orders by lastMessageAt desc', async () => {
      prisma.chatConversation.findMany.mockResolvedValue([]);

      await service.getConversations('user-1');

      expect(prisma.chatConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { lastMessageAt: 'desc' } }),
      );
    });

    it('includes contract with user profiles and last message', async () => {
      prisma.chatConversation.findMany.mockResolvedValue([]);

      await service.getConversations('user-1');

      const call = prisma.chatConversation.findMany.mock.calls[0][0] as any;
      expect(call.include.contract).toBeDefined();
      expect(call.include.messages).toBeDefined();
    });

    it('includes only the latest message (take: 1)', async () => {
      prisma.chatConversation.findMany.mockResolvedValue([]);

      await service.getConversations('user-1');

      const call = prisma.chatConversation.findMany.mock.calls[0][0] as any;
      expect(call.include.messages.take).toBe(1);
    });

    it('returns conversations array', async () => {
      const convs = [{ id: 'c1' }, { id: 'c2' }];
      prisma.chatConversation.findMany.mockResolvedValue(convs);

      const result = await service.getConversations('user-1');

      expect(result).toBe(convs);
    });
  });

  // ── getMessages ───────────────────────────────────────────────────────────

  describe('getMessages', () => {
    const conv = { id: 'conv-1', landlordId: 'landlord-1', tenantId: 'tenant-1' };

    it('returns messages for landlord', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);
      const msgs = [{ id: 'm1' }];
      prisma.chatMessage.findMany.mockResolvedValue(msgs);

      const result = await service.getMessages('conv-1', 'landlord-1');

      expect(result).toBe(msgs);
    });

    it('returns messages for tenant', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);
      const msgs = [{ id: 'm1' }];
      prisma.chatMessage.findMany.mockResolvedValue(msgs);

      const result = await service.getMessages('conv-1', 'tenant-1');

      expect(result).toBe(msgs);
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(null);

      await expect(service.getMessages('conv-999', 'landlord-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not a participant', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);

      await expect(service.getMessages('conv-1', 'intruder')).rejects.toThrow(ForbiddenException);
    });

    it('queries messages ordered newest first with limit 30', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);
      prisma.chatMessage.findMany.mockResolvedValue([]);

      await service.getMessages('conv-1', 'landlord-1');

      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
          take: 30,
        }),
      );
    });

    it('applies cursor filter when cursor is provided', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);
      prisma.chatMessage.findMany.mockResolvedValue([]);
      const cursor = '2026-05-01T10:00:00.000Z';

      await service.getMessages('conv-1', 'landlord-1', cursor);

      expect(prisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ createdAt: { lt: new Date(cursor) } }),
        }),
      );
    });

    it('does not apply cursor filter when cursor is undefined', async () => {
      prisma.chatConversation.findUnique.mockResolvedValue(conv);
      prisma.chatMessage.findMany.mockResolvedValue([]);

      await service.getMessages('conv-1', 'landlord-1');

      const call = prisma.chatMessage.findMany.mock.calls[0][0] as any;
      expect(call.where.createdAt).toBeUndefined();
    });
  });

  // ── createMessage ─────────────────────────────────────────────────────────

  describe('createMessage', () => {
    it('creates message and updates conversation lastMessageAt in a transaction', async () => {
      const message = { id: 'msg-1', text: 'Xin chào' };
      prisma.$transaction.mockResolvedValue([message, {}]);

      const result = await service.createMessage('conv-1', 'sender-1', 'Xin chào');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toBe(message);
    });

    it('creates message with text only', async () => {
      const message = { id: 'msg-1', text: 'Hợp đồng đã ký' };
      prisma.$transaction.mockImplementation(async (ops: any[]) => [await ops[0], await ops[1]]);
      prisma.chatMessage.create.mockResolvedValue(message);
      prisma.chatConversation.update.mockResolvedValue({});

      await service.createMessage('conv-1', 'sender-1', 'Hợp đồng đã ký');

      expect(prisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversationId: 'conv-1',
            senderId: 'sender-1',
            text: 'Hợp đồng đã ký',
          }),
        }),
      );
    });

    it('creates message with imageUrl only', async () => {
      const message = { id: 'msg-2', imageUrl: 'https://example.com/img.jpg' };
      prisma.$transaction.mockImplementation(async (ops: any[]) => [await ops[0], await ops[1]]);
      prisma.chatMessage.create.mockResolvedValue(message);
      prisma.chatConversation.update.mockResolvedValue({});

      await service.createMessage('conv-1', 'sender-1', undefined, 'https://example.com/img.jpg');

      expect(prisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ imageUrl: 'https://example.com/img.jpg' }),
        }),
      );
    });

    it('updates conversation lastMessageAt', async () => {
      prisma.$transaction.mockImplementation(async (ops: any[]) => [await ops[0], await ops[1]]);
      prisma.chatMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.chatConversation.update.mockResolvedValue({});

      await service.createMessage('conv-1', 'sender-1', 'Hi');

      expect(prisma.chatConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-1' },
          data: expect.objectContaining({ lastMessageAt: expect.any(Date) }),
        }),
      );
    });
  });

  // ── markRead ──────────────────────────────────────────────────────────────

  describe('markRead', () => {
    it('marks all unread messages from others as read', async () => {
      prisma.chatMessage.updateMany.mockResolvedValue({ count: 3 });
      prisma.chatConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        landlordId: 'landlord-1',
        tenantId: 'tenant-1',
      });
      prisma.chatConversation.update.mockResolvedValue({});

      await service.markRead('conv-1', 'landlord-1');

      expect(prisma.chatMessage.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 'conv-1', senderId: { not: 'landlord-1' }, isRead: false },
          data: { isRead: true, readAt: expect.any(Date) },
        }),
      );
    });

    it('resets landlordUnreadCount to 0 when reader is the landlord', async () => {
      prisma.chatMessage.updateMany.mockResolvedValue({ count: 1 });
      prisma.chatConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        landlordId: 'landlord-1',
        tenantId: 'tenant-1',
      });
      prisma.chatConversation.update.mockResolvedValue({});

      await service.markRead('conv-1', 'landlord-1');

      expect(prisma.chatConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { landlordUnreadCount: 0 } }),
      );
    });

    it('resets tenantUnreadCount to 0 when reader is the tenant', async () => {
      prisma.chatMessage.updateMany.mockResolvedValue({ count: 1 });
      prisma.chatConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        landlordId: 'landlord-1',
        tenantId: 'tenant-1',
      });
      prisma.chatConversation.update.mockResolvedValue({});

      await service.markRead('conv-1', 'tenant-1');

      expect(prisma.chatConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tenantUnreadCount: 0 } }),
      );
    });

    it('returns early without updating conversation when conversation is not found', async () => {
      prisma.chatMessage.updateMany.mockResolvedValue({ count: 0 });
      prisma.chatConversation.findUnique.mockResolvedValue(null);

      await service.markRead('conv-999', 'user-1');

      expect(prisma.chatConversation.update).not.toHaveBeenCalled();
    });
  });
});
