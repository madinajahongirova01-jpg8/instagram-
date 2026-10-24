import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { RealtimeEvents, type RealtimeAck } from '@insta/shared';
import { DtoMapper, userSummarySelect } from '../common/mappers/dto-mapper.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';
import { MessagesService } from '../messages/messages.service';
import { VisibilityService } from '../privacy/visibility.service';
import { extractBearer } from '../common/guards/jwt-auth.guard';
import { RealtimeService, userRoom } from './realtime.service';
import { CallAnswerDto, CallIceDto, CallOfferDto, CallRejectDto, CallTargetDto, ConversationEventDto } from './dto/realtime.dto';

interface SocketData {
  userId?: string;
}

type AppSocket = Socket<Record<string, never>, Record<string, never>, Record<string, never>, SocketData>;

type Ack = RealtimeAck;

@WebSocketGateway()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: () => new WsException('Invalid payload'),
  }),
)
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly realtime: RealtimeService,
    private readonly sessions: SessionsService,
    private readonly messages: MessagesService,
    private readonly visibility: VisibilityService,
    private readonly prisma: PrismaService,
    private readonly mapper: DtoMapper,
  ) {}

  afterInit(server: Server): void {
    this.realtime.attach(server);
  }

  async handleConnection(client: AppSocket): Promise<void> {
    const auth = client.handshake.auth as { token?: unknown } | undefined;
    const token =
      (typeof auth?.token === 'string' ? auth.token : null) ?? extractBearer(client.handshake.headers.authorization);
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      const user = await this.sessions.verifyAccessToken(token);
      client.data.userId = user.id;
      await client.join(userRoom(user.id));
      if (this.realtime.connected(user.id)) {
        await this.broadcastPresence(user.id, RealtimeEvents.PresenceOnline);
      }
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: AppSocket): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }
    if (this.realtime.disconnected(userId)) {
      await this.prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
      await this.broadcastPresence(userId, RealtimeEvents.PresenceOffline);
    }
  }

  @SubscribeMessage(RealtimeEvents.TypingStart)
  typingStart(@ConnectedSocket() client: AppSocket, @MessageBody() body: ConversationEventDto): Promise<Ack> {
    return this.typing(client, body.conversationId, true);
  }

  @SubscribeMessage(RealtimeEvents.TypingStop)
  typingStop(@ConnectedSocket() client: AppSocket, @MessageBody() body: ConversationEventDto): Promise<Ack> {
    return this.typing(client, body.conversationId, false);
  }

  @SubscribeMessage(RealtimeEvents.ConversationRead)
  async read(@ConnectedSocket() client: AppSocket, @MessageBody() body: ConversationEventDto): Promise<Ack> {
    const userId = this.userId(client);
    try {
      await this.messages.markRead(userId, body.conversationId);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Conversation not found' };
    }
  }

  @SubscribeMessage(RealtimeEvents.CallOffer)
  async callOffer(@ConnectedSocket() client: AppSocket, @MessageBody() body: CallOfferDto): Promise<Ack> {
    const caller = await this.prisma.user.findUnique({ where: { id: this.userId(client) }, select: userSummarySelect });
    if (!caller) {
      return { ok: false, error: 'Unauthorized' };
    }
    return this.relay(
      client,
      body.toUserId,
      RealtimeEvents.CallOffer,
      { from: this.mapper.user(caller), callType: body.callType, sdp: body.sdp },
      true,
    );
  }

  @SubscribeMessage(RealtimeEvents.CallAnswer)
  callAnswer(@ConnectedSocket() client: AppSocket, @MessageBody() body: CallAnswerDto): Promise<Ack> {
    return this.relay(client, body.toUserId, RealtimeEvents.CallAnswer, { sdp: body.sdp });
  }

  @SubscribeMessage(RealtimeEvents.CallIceCandidate)
  callIce(@ConnectedSocket() client: AppSocket, @MessageBody() body: CallIceDto): Promise<Ack> {
    return this.relay(client, body.toUserId, RealtimeEvents.CallIceCandidate, { candidate: body.candidate });
  }

  @SubscribeMessage(RealtimeEvents.CallReject)
  callReject(@ConnectedSocket() client: AppSocket, @MessageBody() body: CallRejectDto): Promise<Ack> {
    return this.relay(client, body.toUserId, RealtimeEvents.CallReject, { reason: body.reason ?? 'REJECTED' });
  }

  @SubscribeMessage(RealtimeEvents.CallEnd)
  callEnd(@ConnectedSocket() client: AppSocket, @MessageBody() body: CallTargetDto): Promise<Ack> {
    return this.relay(client, body.toUserId, RealtimeEvents.CallEnd, {});
  }

  private async typing(client: AppSocket, conversationId: string, isTyping: boolean): Promise<Ack> {
    const userId = this.userId(client);
    try {
      const participants = await this.messages.participantIds(conversationId, userId);
      this.realtime.emitToUsers(
        participants.filter((id) => id !== userId),
        RealtimeEvents.Typing,
        { conversationId, userId, isTyping },
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'Conversation not found' };
    }
  }

  private async relay(
    client: AppSocket,
    toUserId: string,
    event: string,
    payload: Record<string, unknown>,
    requireMessagingPermission = false,
  ): Promise<Ack> {
    const fromUserId = this.userId(client);
    if (toUserId === fromUserId || (await this.visibility.isBlockedEitherWay(fromUserId, toUserId))) {
      return { ok: false, error: 'User is not available' };
    }
    if (requireMessagingPermission) {
      const target = await this.prisma.privacySettings.findUnique({
        where: { userId: toUserId },
        select: { allowDirectMessages: true },
      });
      if (!(await this.visibility.allows(target?.allowDirectMessages ?? 'EVERYONE', fromUserId, toUserId))) {
        return { ok: false, error: 'User does not accept calls from you' };
      }
    }
    if (!this.realtime.isOnline(toUserId)) {
      return { ok: false, error: 'User is offline' };
    }
    this.realtime.emitToUser(toUserId, event, { fromUserId, ...payload });
    return { ok: true };
  }

  private async broadcastPresence(userId: string, event: string): Promise<void> {
    try {
      const settings = await this.prisma.privacySettings.findUnique({ where: { userId }, select: { showOnlineStatus: true } });
      if (settings?.showOnlineStatus === false) {
        return;
      }
      const contacts = await this.messages.contactIds(userId);
      this.realtime.emitToUsers(contacts, event, { userId, at: new Date().toISOString() });
    } catch (error) {
      this.logger.warn({ err: (error as Error).message }, 'Presence broadcast failed');
    }
  }

  private userId(client: AppSocket): string {
    const userId = client.data.userId;
    if (!userId) {
      throw new WsException('Unauthorized');
    }
    return userId;
  }
}
