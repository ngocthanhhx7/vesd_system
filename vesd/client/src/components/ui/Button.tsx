import { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return (
    <button
      className={clsx(
        'focus-ring inline-flex max-w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-brand text-white shadow-soft hover:bg-secondary',
        variant === 'secondary' && 'border border-line bg-white text-ink hover:bg-soft',
        variant === 'ghost' && 'text-ink hover:bg-white',
        variant === 'danger' && 'bg-secondary text-white hover:bg-night',
        className
      )}
      {...props}
    />
  );
}
