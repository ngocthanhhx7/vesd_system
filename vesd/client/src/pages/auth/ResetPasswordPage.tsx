import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Primitives';
import { AuthShell } from './AuthShell';

export function ResetPasswordPage() {
  return (
    <AuthShell title="Dat lai mat khau">
      <div className="space-y-4">
        <Input type="password" placeholder="Mat khau moi" />
        <Input type="password" placeholder="Nhap lai mat khau" />
        <Button className="w-full">Cap nhat mat khau</Button>
      </div>
    </AuthShell>
  );
}
