import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Primitives';
import { AuthShell } from './AuthShell';

export function ForgotPasswordPage() {
  return (
    <AuthShell title="Khôi phục mật khẩu">
      <div className="space-y-4">
        <Input type="email" placeholder="Email của bạn" />
        <Button className="w-full">Gửi link khôi phục</Button>
      </div>
    </AuthShell>
  );
}

