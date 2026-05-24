import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  loading?: 'eager' | 'lazy';
};

function initialsFor(name?: string | null) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = Array.from(parts[0])[0] || '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] || '' : '';
  return `${first}${last}`.toUpperCase();
}

export function Avatar({ src, name, className, imageClassName, fallbackClassName, loading }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = initialsFor(name);
  const showImage = Boolean(src) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-soft text-xs font-bold text-brand', className)}>
      {showImage ? (
        <img
          className={clsx('h-full w-full object-cover', imageClassName)}
          src={src || undefined}
          alt={name ? `${name} avatar` : 'Avatar'}
          loading={loading}
          onError={() => setFailed(true)}
        />
      ) : initials ? (
        <span className={clsx('select-none leading-none', fallbackClassName)} aria-label={name || 'Avatar'}>
          {initials}
        </span>
      ) : (
        <UserRound className={clsx('h-2/3 w-2/3', fallbackClassName)} aria-hidden="true" />
      )}
    </span>
  );
}
