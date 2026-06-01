import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canJoinConversation,
  conversationRoom,
  getSocketToken,
  userRoom
} from '../realtime/socket.js';

test('socket room helpers use stable namespaced room names', () => {
  assert.equal(userRoom('user-1'), 'user:user-1');
  assert.equal(conversationRoom('conversation-1'), 'conversation:conversation-1');
});

test('socket auth token can be read from auth payload or bearer header', () => {
  assert.equal(getSocketToken({ handshake: { auth: { token: 'auth-token' }, headers: {} } }), 'auth-token');
  assert.equal(
    getSocketToken({ handshake: { auth: {}, headers: { authorization: 'Bearer header-token' } } }),
    'header-token'
  );
  assert.equal(getSocketToken({ handshake: { auth: {}, headers: {} } }), null);
});

test('conversation join is only allowed for participants', () => {
  assert.equal(canJoinConversation({ participants: ['client-1', 'designer-1'] }, 'client-1'), true);
  assert.equal(canJoinConversation({ participants: ['client-1', { _id: 'designer-1' }] }, 'designer-1'), true);
  assert.equal(canJoinConversation({ participants: ['client-1', 'designer-1'] }, 'other-user'), false);
});
