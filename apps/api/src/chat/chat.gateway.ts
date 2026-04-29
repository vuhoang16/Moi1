import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token as string;
    try {
      const payload = this.jwt.verify(token, { secret: process.env.JWT_SECRET });
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    client.leave(`user:${client.data.userId}`);
  }

  @SubscribeMessage('join-conversation')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const ok = await this.chat.canAccessConversation(data.conversationId, client.data.userId);
    if (ok) client.join(`conv:${data.conversationId}`);
  }

  @SubscribeMessage('send-message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; text?: string; imageUrl?: string },
  ) {
    const message = await this.chat.createMessage(
      data.conversationId,
      client.data.userId,
      data.text,
      data.imageUrl,
    );
    this.server.to(`conv:${data.conversationId}`).emit('new-message', message);
    return message;
  }

  @SubscribeMessage('mark-read')
  async markRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    await this.chat.markRead(data.conversationId, client.data.userId);
    this.server.to(`conv:${data.conversationId}`).emit('messages-read', {
      conversationId: data.conversationId,
      userId: client.data.userId,
    });
  }
}
