import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessConversation(conversationId: string, userId: string): Promise<boolean> {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { landlordId: true, tenantId: true },
    });
    if (!conv) return false;
    return conv.landlordId === userId || conv.tenantId === userId;
  }

  async getConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: { OR: [{ landlordId: userId }, { tenantId: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        contract: {
          select: {
            landlord: { select: { id: true, fullName: true, avatarUrl: true } },
            tenant: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async getMessages(conversationId: string, userId: string, cursor?: string) {
    const conv = await this.prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException();
    if (conv.landlordId !== userId && conv.tenantId !== userId) throw new ForbiddenException();

    return this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(cursor && { createdAt: { lt: new Date(cursor) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async createMessage(conversationId: string, senderId: string, text?: string, imageUrl?: string) {
    const [message] = await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: { conversationId, senderId, text, imageUrl },
      }),
      this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);
    return message;
  }

  async markRead(conversationId: string, userId: string) {
    await this.prisma.chatMessage.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    const conv = await this.prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conv) return;

    if (conv.landlordId === userId) {
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { landlordUnreadCount: 0 },
      });
    } else {
      await this.prisma.chatConversation.update({
        where: { id: conversationId },
        data: { tenantUnreadCount: 0 },
      });
    }
  }
}
