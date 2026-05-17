import clsx from 'clsx';
import { ReactNode } from 'react';
import { Star } from 'lucide-react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('rounded-lg border border-line bg-white p-5 shadow-sm', className)}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'premium' | 'info' }) {
  const tones = {
    neutral: 'bg-soft text-muted',
    success: 'bg-soft text-brand',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-soft text-secondary',
    premium: 'bg-yellow-50 text-premium',
    info: 'bg-soft text-action'
  };
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-base font-semibold', tones[tone])}>{children}</span>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx('focus-ring w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base', props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx('focus-ring min-h-28 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base', props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx('focus-ring w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base', props.className)} />;
}

export function RatingStars({ value = 5 }: { value?: number }) {
  return <span className="inline-flex items-center gap-0.5 text-amber-500">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill={i < Math.round(value) ? 'currentColor' : 'none'} />)}</span>;
}

export function StatusBadge({ status }: { status?: string }) {
  const danger = ['cancelled', 'disputed', 'banned', 'rejected'];
  const success = ['completed', 'verified', 'success', 'active', 'approved'];
  const warning = ['pending', 'payment_pending', 'revision_requested', 'under_review'];
  const labels: Record<string, string> = {
    active: 'Đang hoạt động',
    approved: 'Đã duyệt',
    banned: 'Đã khóa',
    cancelled: 'Đã hủy',
    completed: 'Hoàn thành',
    disputed: 'Đang khiếu nại',
    draft: 'Bản nháp',
    free: 'Miễn phí',
    payment_pending: 'Chờ thanh toán',
    pending: 'Đang chờ',
    rejected: 'Từ chối',
    revision_requested: 'Yêu cầu chỉnh sửa',
    success: 'Thành công',
    under_review: 'Đang xét duyệt',
    verified: 'Đã xác minh'
  };
  const value = status || 'draft';
  return <Badge tone={danger.includes(value) ? 'danger' : success.includes(value) ? 'success' : warning.includes(value) ? 'warning' : 'info'}>{labels[value] || value}</Badge>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-lg bg-pale', className)} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <Card className="text-center"><h3 className="font-semibold">{title}</h3>{description && <p className="mt-1 text-base text-muted">{description}</p>}</Card>;
}
