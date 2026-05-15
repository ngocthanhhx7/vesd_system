import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Primitives';
import { AuthShell } from './AuthShell';

export function ForgotPasswordPage() {
  return (
    <AuthShell title="Khoi phuc mat khau">
      <div className="space-y-4">
        <Input type="email" placeholder="Email cua ban" />
        <Button className="w-full">Gui link khoi phuc</Button>
      </div>
    </AuthShell>
  );
}
