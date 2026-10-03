import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  init(userId: string) {
    if (this.socket) {
      this.disconnect();
    }

    try {
      this.socket = io(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 5000,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[Socket] Connected with ID:', this.socket?.id);
        this.socket?.emit('join', { userId });
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[Socket] Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.warn('[Socket] Connection failed (server may be offline):', error.message);
        this.isConnected = false;
      });
    } catch (err) {
      console.warn('[Socket] Initialization error:', err);
    }
  }

  onPrivateMessage(callback: (msg: any) => void) {
    this.socket?.on('private_message', callback);
  }

  onMessageSent(callback: (msg: any) => void) {
    this.socket?.on('message_sent', callback);
  }

  onTyping(callback: (data: { senderId: string }) => void) {
    this.socket?.on('typing', callback);
  }

  onStopTyping(callback: (data: { senderId: string }) => void) {
    this.socket?.on('stop_typing', callback);
  }

  onUserStatusChanged(callback: (data: { userId: string; status: string }) => void) {
    this.socket?.on('user_status_changed', callback);
  }

  emitTyping(senderId: string, recipientId: string) {
    this.socket?.emit('typing', { senderId, recipientId });
  }

  emitStopTyping(senderId: string, recipientId: string) {
    this.socket?.emit('stop_typing', { senderId, recipientId });
  }

  emitMessage(senderId: string, recipientId: string, content: string) {
    if (this.isConnected && this.socket) {
      this.socket.emit('private_message', { senderId, recipientId, content });
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  get connected() {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
