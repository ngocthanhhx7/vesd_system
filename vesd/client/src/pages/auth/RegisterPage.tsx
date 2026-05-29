import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Primitives';
import { useAuth } from '../../hooks/useAuth';
import { AuthShell } from './AuthShell';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleAuthButton } from './GoogleAuthButton';

export function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
      <h1 className="mb-6 text-center text-[26px] font-bold sm:mb-8 sm:text-[28px]">Tạo tài khoản VESD</h1>
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
            <option value="client">Khách hàng</option>
            <option value="designer">Người thiết kế</option>
          </Select>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full bg-[#3a5bcf] hover:bg-[#3a5bcf]/90 text-white rounded-full py-2.5 text-base font-medium shadow-sm h-11">
          Đăng ký
        </Button>
      </form>

      <div className="mb-6 mt-4 overflow-hidden">
        {googleClientId ? (
          <GoogleAuthButton
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Đăng ký bằng Google thất bại')}
            text="signup_with"
          />
        ) : (
          <button
            type="button"
            className="h-11 w-full rounded-full bg-[#5f5f5f] text-base font-medium text-white"
            onClick={() => setError('Chưa cấu hình VITE_GOOGLE_CLIENT_ID cho frontend')}
          >
            Đăng ký với Google
          </button>
        )}
      </div>
      
      <div className="text-center text-sm">
        <span className="text-[#3a5bcf]">Bạn đã có tài khoản? </span>
        <Link to="/login" className="text-[#3a5bcf] hover:underline underline-offset-2">Đăng nhập</Link>
      </div>
    </AuthShell>
  );
}
