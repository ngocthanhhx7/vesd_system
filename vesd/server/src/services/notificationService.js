import { Notification, User } from '../models/index.js';
import { sendNotificationEmail } from './emailService.js';

/**
 * Central helper for creating notifications.
 * Call from any service / route that needs to notify a user.
 */
export async function createNotification({ userId, type, category = 'system', title, message, actionUrl, metadata }) {
  if (!userId || !type || !title) return null;
  return Notification.create({ userId, type, category, title, message, actionUrl, metadata });
}

/**
 * Broadcast the same notification to multiple users.
 */
export async function broadcastNotification({ userIds = [], type, category = 'system', title, message, actionUrl, metadata }) {
  if (!userIds.length) return [];
  const docs = userIds.map(userId => ({ userId, type, category, title, message, actionUrl, metadata }));
  return Notification.insertMany(docs);
}

// ── SSE connection pool ──
const sseClients = new Map();

export function addSSEClient(userId, res) {
  const id = String(userId);
  if (!sseClients.has(id)) sseClients.set(id, new Set());
  sseClients.get(id).add(res);
  res.on('close', () => {
    sseClients.get(id)?.delete(res);
    if (sseClients.get(id)?.size === 0) sseClients.delete(id);
  });
}

export function pushToUser(userId, event, data) {
  const clients = sseClients.get(String(userId));
  if (!clients) return;
  for (const res of clients) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

/**
 * Create notification AND push to SSE if user is online.
 * Also sends email if user preferences allow it.
 */
export async function notify({ userId, type, category, title, message, actionUrl, metadata }) {
  const notif = await createNotification({ userId, type, category, title, message, actionUrl, metadata });
  if (notif) {
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    pushToUser(userId, 'notification', { notification: notif, unreadCount });

    // Send email notification (fire-and-forget)
    User.findById(userId).select('email notificationPreferences').lean().then(user => {
      if (user) sendNotificationEmail(user, notif).catch(() => {});
    }).catch(() => {});
  }
  return notif;
}
