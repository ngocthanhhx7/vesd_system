import clsx from 'clsx';
import { ReactNode } from 'react';
import { Star } from 'lucide-react';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('min-w-0 overflow-hidden rounded-lg border border-line bg-white p-5 shadow-sm', className)}>{children}</div>;
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
  const danger = ['cancelled', 'disputed', 'banned', 'rejected', 'failed'];
  const success = ['completed', 'verified', 'success', 'active', 'approved', 'paid', 'final_submitted'];
  const warning = ['pending', 'pending_designer', 'agreement_pending', 'payment_pending', 'revision_requested', 'under_review'];
  const labels: Record<string, string> = {
    active: 'Đang hoạt động',
    agreement_pending: 'Chờ thỏa thuận',
    approved: 'Đã duyệt',
    banned: 'Đã khóa',
    cancelled: 'Đã hủy',
    completed: 'Hoàn thành',
    disputed: 'Đang khiếu nại',
    draft: 'Bản nháp',
    escrow_funded: 'Đã escrow',
    failed: 'Thất bại',
    final_submitted: 'Đã bàn giao',
    free: 'Miễn phí',
    in_progress: 'Đang làm',
    payment_pending: 'Chờ thanh toán',
    paid: 'Đã chi',
    pending: 'Đang chờ',
    pending_designer: 'Chờ designer',
    rejected: 'Từ chối',
    revision_requested: 'Yêu cầu chỉnh sửa',
    submitted: 'Chờ duyệt',
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

export function FormGroup({ label, helper, required, children }: { label: string; helper?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {helper && <p className="mt-1 text-xs text-muted">{helper}</p>}
    </div>
  );
}

export function FileUpload({ accept, fileName, savedUrl, savedLabel, onChange }: {
  accept?: string;
  fileName?: string;
  savedUrl?: string;
  savedLabel?: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="file-upload-zone">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-soft/50 px-4 py-5 text-center transition hover:border-brand hover:bg-soft">
        <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="text-sm font-medium text-muted">
          {fileName ? fileName : 'Nhấp hoặc kéo thả ảnh vào đây'}
        </span>
        <input className="hidden" type="file" accept={accept || 'image/*'} onChange={(e) => onChange(e.target.files?.[0] || null)} />
      </label>
      {!fileName && savedUrl && (
        <a className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline" href={savedUrl} target="_blank" rel="noreferrer">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6.375c0-.621.504-1.125 1.125-1.125H18M13.5 6l4.5 4.5" />
          </svg>
          {savedLabel || 'Xem ảnh đã lưu'}
        </a>
      )}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={clsx('border-t border-line', className)} />;
}

