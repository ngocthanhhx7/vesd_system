import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';

type GoogleAuthButtonProps = {
  text: 'signin_with' | 'signup_with';
  onSuccess: (credentialResponse: any) => void;
  onError: () => void;
};

export function GoogleAuthButton({ text, onSuccess, onError }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const nextWidth = Math.max(220, Math.min(400, Math.floor(container.getBoundingClientRect().width)));
      setWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex w-full justify-center [&>div]:!w-full [&_iframe]:!w-full">
      {width && (
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          theme="filled_black"
          size="large"
          width={width}
          text={text}
          shape="pill"
        />
      )}
    </div>
  );
}
