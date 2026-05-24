import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { endpoints } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Thiếu token xác thực trong đường dẫn.');
      return;
    }
    endpoints.verifyEmail(token)
      .then((result) => {
        if (result.alreadyVerified) {
          setStatus('already');
          setMessage('Email của bạn đã được xác thực trước đó.');
        } else {
          setStatus('success');
          setMessage('Email của bạn đã được xác thực thành công!');
        }
        refreshUser?.();
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Không thể xác thực email. Token có thể đã hết hạn.');
      });
  }, [token]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="verify-email-card w-full rounded-2xl bg-white p-8 shadow-lg">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
            <h1 className="text-2xl font-black text-ink">Đang xác thực...</h1>
            <p className="mt-2 text-muted">Vui lòng đợi trong giây lát</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-ink">Xác thực thành công!</h1>
            <p className="mt-2 text-muted">{message}</p>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-ink">Đã xác thực</h1>
            <p className="mt-2 text-muted">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-ink">Xác thực thất bại</h1>
            <p className="mt-2 text-muted">{message}</p>
          </>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Link
            to="/"
            className="focus-ring inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-base font-semibold text-white shadow-soft hover:bg-secondary"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
