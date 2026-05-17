import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';
import { Eye, EyeOff } from 'lucide-react';

export function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await register({ name: String(fd.get('name')), email: String(fd.get('email')), password: String(fd.get('password')), role: String(fd.get('role')) });
      navigate('/role-selection');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    try {
      setError('');
      await loginWithGoogle(credentialResponse.credential);
      navigate('/role-selection');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <AuthShell title="Tạo tài khoản VESD">
      <h1 className="mb-8 text-center text-[28px] font-bold">Tạo tài khoản VESD</h1>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Họ tên</label>
          <Input name="name" placeholder="Nhập họ tên của bạn" className="w-full border-gray-300" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Email</label>
          <Input name="email" type="email" placeholder="Email của bạn" className="w-full border-gray-300" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Mật khẩu</label>
          <div className="relative">
            <Input 
              name="password" 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Mật khẩu tối thiểu 8 ký tự" 
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

        <div className="space-y-1.5">
          <label className="text-sm font-semibold">Vai trò</label>
          <Select name="role" className="w-full border-gray-300">
            <option value="client">Khách hàng (Client)</option>
            <option value="designer">Người thiết kế (Designer)</option>
          </Select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full bg-[#3a5bcf] hover:bg-[#3a5bcf]/90 text-white rounded-full py-2.5 text-base font-medium shadow-sm h-11">
          Đăng ký
        </Button>
      </form>

      <div className="mt-4 mb-6">
        <div className="rounded-full overflow-hidden h-11 relative">
          <div className="absolute inset-0 opacity-0 z-10 w-full h-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Đăng ký bằng Google thất bại')}
              theme="filled_black"
              size="large"
              width="100%"
              text="signup_with"
              shape="pill"
            />
          </div>
          <button type="button" className="w-full h-full bg-[#5f5f5f] hover:bg-[#4f4f4f] text-white flex items-center justify-center gap-2 text-base font-medium transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Đăng ký với Google
          </button>
        </div>
      </div>
      
      <div className="text-center text-sm">
        <span className="text-[#3a5bcf]">Bạn đã có tài khoản? </span>
        <Link to="/login" className="text-[#3a5bcf] hover:underline underline-offset-2">Đăng nhập</Link>
      </div>
    </AuthShell>
  );
}
