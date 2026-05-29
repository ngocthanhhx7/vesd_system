import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';

const REMEMBERED_LOGIN_KEY = 'vesd_remembered_login';

type RememberedLogin = {
  email: string;
  password: string;
};

function getRememberedLogin(): RememberedLogin | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RememberedLogin>;
    if (typeof parsed.email !== 'string' || typeof parsed.password !== 'string') return null;

    return { email: parsed.email, password: parsed.password };
  } catch {
    window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
    return null;
  }
}

function updateRememberedLogin(remember: boolean, loginData: RememberedLogin) {
  if (!remember) {
    window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
    return;
  }

  window.localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify(loginData));
}

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberedLogin] = useState(getRememberedLogin);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email'));
    const password = String(fd.get('password'));
    const rememberMe = fd.get('rememberMe') === 'on';

    try {
      await login(email, password);
      updateRememberedLogin(rememberMe, { email, password });
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    try {
      setError('');
      await loginWithGoogle(credentialResponse.credential);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <AuthShell title="Đăng nhập">
      <h1 className="mb-6 text-center text-[26px] font-bold sm:mb-8 sm:text-[28px]">Chào mừng bạn !</h1>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Tài khoản</label>
          <div className="relative">
            <Input name="email" type="text" placeholder="Email hoặc số điện thoại" defaultValue={rememberedLogin?.email ?? ''} className="w-full pr-10 border-gray-300" />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Eye className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Mật khẩu</label>
          <div className="relative">
            <Input 
              name="password" 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Nhập mật khẩu" 
              defaultValue={rememberedLogin?.password ?? ''}
              className="w-full pr-10 border-gray-300" 
            />
            <button 
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input name="rememberMe" type="checkbox" defaultChecked={Boolean(rememberedLogin)} className="h-4 w-4 rounded border-gray-300 text-[#3a5bcf] focus:ring-[#3a5bcf]" />
            <span className="text-gray-600">Ghi nhớ tôi</span>
          </label>
          <Link className="w-full text-right text-[#3a5bcf] hover:underline sm:w-auto" to="/forgot-password">Quên mật khẩu?</Link>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full bg-[#3a5bcf] hover:bg-[#3a5bcf]/90 text-white rounded-full py-2.5 text-base font-medium shadow-sm h-11">
          Đăng Nhập
        </Button>
      </form>

      <div className="mb-6 mt-4 overflow-hidden">
        {googleClientId ? (
          <GoogleAuthButton
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Đăng nhập Google thất bại')}
            text="signin_with"
          />
        ) : (
          <button
            type="button"
            className="h-11 w-full rounded-full bg-[#5f5f5f] text-base font-medium text-white"
            onClick={() => setError('Chua cau hinh VITE_GOOGLE_CLIENT_ID cho frontend')}
          >
            Đăng nhập với Google
          </button>
        )}
      </div>
      
      <div className="text-center text-sm">
        <span className="text-[#3a5bcf]">Bạn chưa có tài khoản? </span>
        <Link to="/register" className="text-[#3a5bcf] hover:underline underline-offset-2">Đăng ký</Link>
      </div>
    </AuthShell>
  );
}

