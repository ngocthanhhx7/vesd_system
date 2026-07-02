import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { Conversation, User } from '../models/index.js';
import { verifyToken } from '../utils/token.js';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;
let ioInstance = null;

function entityId(value) {
  return String(value?._id || value || '');
}

export function userRoom(userId) {
  return `user:${entityId(userId)}`;
}

export function conversationRoom(conversationId) {
  return `conversation:${entityId(conversationId)}`;
}

export function getSocketToken(socket) {
  const authToken = socket?.handshake?.auth?.token;
  if (authToken) return String(authToken);

  const header = socket?.handshake?.headers?.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export function canJoinConversation(conversation, userId) {
  const currentUserId = entityId(userId);
  return Boolean(conversation?.participants?.some((participant) => entityId(participant) === currentUserId));
}

export function getRealtimeServer() {
  return ioInstance;
}

export function emitToUsers(userIds = [], eventName, payload) {
  if (!ioInstance) return;
  for (const userId of userIds) {
    ioInstance.to(userRoom(userId)).emit(eventName, payload);
  }
}

export function emitToConversation(conversationId, eventName, payload) {
  if (!ioInstance) return;
  ioInstance.to(conversationRoom(conversationId)).emit(eventName, payload);
}

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrls,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = getSocketToken(socket);
      if (!token) return next(new Error('Unauthorized'));

      const payload = verifyToken(token);
      const user = await User.findById(payload.sub).select('-passwordHash');
      if (!user || user.status !== 'active') return next(new Error('Unauthorized'));

      socket.data.user = user;
      next();
    } catch (_error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(userRoom(socket.data.user._id));

    socket.on('conversation:join', async (payload = {}, ack) => {
      const conversationId = String(payload?.conversationId || payload || '');
      const respond = typeof ack === 'function' ? ack : () => undefined;

      try {
        if (!objectIdPattern.test(conversationId)) {
          return respond({ ok: false, message: 'Cuộc trò chuyện không hợp lệ' });
        }

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.data.user._id
        }).select('_id participants');

        if (!canJoinConversation(conversation, socket.data.user._id)) {
          return respond({ ok: false, message: 'Không tìm thấy cuộc trò chuyện' });
        }

        socket.join(conversationRoom(conversation._id));
        respond({ ok: true, conversationId: entityId(conversation._id) });
      } catch (_error) {
        respond({ ok: false, message: 'Không thể tham gia cuộc trò chuyện' });
      }
    });

    socket.on('conversation:leave', (payload = {}) => {
      const conversationId = String(payload?.conversationId || payload || '');
      if (objectIdPattern.test(conversationId)) {
        socket.leave(conversationRoom(conversationId));
      }
    });
  });

  ioInstance = io;
  return io;
}
