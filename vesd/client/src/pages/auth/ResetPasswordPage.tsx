import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Primitives';
import { AuthShell } from './AuthShell';

export function ResetPasswordPage() {
  return (
    <AuthShell title="Đặt lại mật khẩu">
      <div className="space-y-4">
        <Input type="password" placeholder="Mật khẩu mới" />
        <Input type="password" placeholder="Nhập lại mật khẩu" />
        <Button className="w-full">Cập nhật mật khẩu</Button>
      </div>
    </AuthShell>
  );
}
