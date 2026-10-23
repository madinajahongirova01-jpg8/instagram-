import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

@Injectable()
export class RealtimeService {
  private server: Server | null = null;
  private readonly connections = new Map<string, number>();

  attach(server: Server): void {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  emitToUsers(userIds: Iterable<string>, event: string, payload: unknown): void {
    const rooms = [...new Set(userIds)].map(userRoom);
    if (rooms.length > 0) {
      this.server?.to(rooms).emit(event, payload);
    }
  }

  connected(userId: string): boolean {
    const count = (this.connections.get(userId) ?? 0) + 1;
    this.connections.set(userId, count);
    return count === 1;
  }

  disconnected(userId: string): boolean {
    const count = (this.connections.get(userId) ?? 1) - 1;
    if (count <= 0) {
      this.connections.delete(userId);
      return true;
    }
    this.connections.set(userId, count);
    return false;
  }

  isOnline(userId: string): boolean {
    return (this.connections.get(userId) ?? 0) > 0;
  }
}
