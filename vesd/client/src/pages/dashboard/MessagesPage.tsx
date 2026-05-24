import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Inbox, MessageCircle, Send, UserRound } from 'lucide-react';
import { endpoints } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState, Skeleton, Textarea } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { Dashboard } from './shared/Dashboard';

function userId(value: any) {
  return String(value?._id || value || '');
}

function displayDate(value?: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function otherParticipant(conversation: any, currentUserId?: string) {
  return userId(conversation.clientId) === currentUserId ? conversation.designerId : conversation.clientId;
}

function avatarFor(user: any, seed = 'vesd') {
  return user?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user?.name || seed)}`;
}

export function MessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const basePath = user?.roles.includes('designer') ? '/designer/messages' : '/client/messages';
  const currentUserId = user?._id || '';

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: endpoints.conversations
  });

  const activeConversation = useMemo(() => (
    conversations.find((conversation: any) => conversation._id === id) || conversations[0]
  ), [conversations, id]);
  const activeId = activeConversation?._id;

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['conversation-messages', activeId],
    queryFn: () => endpoints.conversationMessages(activeId),
    enabled: Boolean(activeId)
  });

  useEffect(() => {
    if (!activeId) return;
    endpoints.markConversationRead(activeId)
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch(() => undefined);
  }, [activeId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: (message: string) => endpoints.sendConversationMessage(activeId, { content: message }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', activeId] });
    }
  });

  function openConversation(conversationId: string) {
    navigate(`${basePath}/${conversationId}`);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = content.trim();
    if (!message || !activeId) return;
    sendMessage.mutate(message);
  }

  const messages = thread?.messages || [];
  const activeOther = activeConversation ? otherParticipant(activeConversation, currentUserId) : null;

  return (
    <Dashboard title="Tin nhắn">
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-brand" />
              <h2 className="text-lg font-black">Cuộc trò chuyện</h2>
            </div>
            <span className="rounded-full bg-soft px-2.5 py-1 text-xs font-bold text-brand">{conversations.length}</span>
          </div>
          <div className="max-h-[640px] overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16" />)}
              </div>
            ) : conversations.length ? conversations.map((conversation: any) => {
              const participant = otherParticipant(conversation, currentUserId);
              const hasUnread = conversation.unreadBy?.some((item: any) => userId(item) === currentUserId);
              const active = conversation._id === activeId;
              return (
                <button
                  key={conversation._id}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${active ? 'bg-soft' : 'hover:bg-soft/70'}`}
                  onClick={() => openConversation(conversation._id)}
                >
                  <Avatar className="h-11 w-11" src={avatarFor(participant, conversation._id)} name={participant?.name || 'Người dùng'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-ink">{participant?.name || 'Người dùng VESD'}</span>
                      <span className="text-[11px] text-muted">{displayDate(conversation.lastMessageAt || conversation.updatedAt)}</span>
                    </span>
                    <span className="mt-1 block truncate text-sm text-muted">{conversation.lastMessage || 'Bắt đầu trao đổi về dự án'}</span>
                  </span>
                  {hasUnread && <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-label="Tin nhắn chưa đọc" />}
                </button>
              );
            }) : (
              <div className="p-4">
                <EmptyState title="Chưa có tin nhắn" description="Tin nhắn từ profile designer sẽ xuất hiện tại đây." />
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-[640px] rounded-lg border border-line bg-white">
          {!activeConversation ? (
            <div className="flex min-h-[640px] items-center justify-center p-6">
              <div className="text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-brand" />
                <h2 className="mt-4 text-2xl font-black">Chọn designer để bắt đầu trao đổi</h2>
                <p className="mt-2 text-muted">Khách hàng có thể nhắn trực tiếp từ trang hồ sơ designer.</p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[640px] flex-col">
              <header className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11" src={avatarFor(activeOther, activeId)} name={activeOther?.name || 'Người dùng'} />
                  <div>
                    <h2 className="text-lg font-black">{activeOther?.name || 'Người dùng VESD'}</h2>
                    <p className="text-sm text-muted">Trao đổi trực tiếp trước khi tạo brief hoặc milestone.</p>
                  </div>
                </div>
                <UserRound className="hidden h-5 w-5 text-muted sm:block" />
              </header>

              <div className="flex-1 space-y-4 overflow-y-auto bg-surface/50 p-5">
                {threadLoading ? (
                  Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className={`h-16 ${index % 2 ? 'ml-auto w-2/3' : 'w-2/3'}`} />)
                ) : messages.length ? messages.map((message: any) => {
                  const mine = userId(message.senderId) === currentUserId;
                  return (
                    <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${mine ? 'bg-brand text-white' : 'border border-line bg-white text-ink'}`}>
                        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        <p className={`mt-2 text-[11px] ${mine ? 'text-white/75' : 'text-muted'}`}>{displayDate(message.createdAt)}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex h-full items-center justify-center">
                    <EmptyState title="Chưa có nội dung trao đổi" description="Gửi tin nhắn đầu tiên để thống nhất brief, ngân sách và deadline." />
                  </div>
                )}
              </div>

              <form className="border-t border-line p-4" onSubmit={submit}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Textarea
                    className="min-h-[52px] flex-1 resize-none"
                    placeholder="Nhập tin nhắn..."
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                  />
                  <Button className="h-[52px] rounded-full px-6" disabled={!content.trim() || sendMessage.isPending}>
                    <Send size={18} /> Gửi
                  </Button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </Dashboard>
  );
}
