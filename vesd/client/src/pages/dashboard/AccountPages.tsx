import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, CreditCard, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Input, Select, StatusBadge, Textarea } from '../../components/ui/Primitives';
import { Button } from '../../components/ui/Button';
import { endpoints } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Dashboard, Section } from './shared/Dashboard';
import { Metric } from './shared/Metric';

const bankOptions = [
  'Vietcombank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'VPBank',
  'Sacombank',
  'TPBank',
  'HDBank',
  'VIB',
  'OCB',
  'MSB',
  'SHB'
];

export function WalletPage() {
  const { user } = useAuth();
  const walletBasePath = user?.roles.includes('designer') ? '/designer/earnings' : '/client/wallet';
  const { data } = useQuery({ queryKey: ['wallet'], queryFn: endpoints.wallet });
  const { data: tx = [] } = useQuery({ queryKey: ['tx'], queryFn: endpoints.transactions });
  return (
    <Dashboard title="Ví tiền">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Số dư" value={(data?.balance || 0).toLocaleString('vi-VN')} icon={CreditCard} />
        <Metric label="Đang giữ escrow" value={(data?.escrowBalance || 0).toLocaleString('vi-VN')} icon={ShieldAlert} />
        <Metric label="Đang chờ rút" value={(data?.pendingBalance || 0).toLocaleString('vi-VN')} icon={Clock} />
      </div>

      <Card>
        <div className="flex flex-wrap gap-3">
          <Link className="focus-ring inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-base font-semibold text-white shadow-soft hover:bg-secondary" to={`${walletBasePath}/topup`}>
            Nạp tiền
          </Link>
          <Link className="focus-ring inline-flex items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-base font-semibold text-ink hover:bg-soft" to={`${walletBasePath}/withdraw`}>
            Rút tiền
          </Link>
        </div>
      </Card>

      <Section title="Lịch sử giao dịch">
        {tx.map((t: any) => (
          <Card key={t._id}>
            <div className="flex flex-wrap justify-between gap-3">
              <span>{t.type}</span>
              <span>{t.amount?.toLocaleString('vi-VN')}đ</span>
              <StatusBadge status={t.status} />
            </div>
          </Card>
        ))}
      </Section>
    </Dashboard>
  );
}

export function WalletTopupPage() {
  const queryClient = useQueryClient();
  const [topupAmount, setTopupAmount] = useState('10000');
  const [topupMessage, setTopupMessage] = useState('');
  const refreshMoneyData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['tx'] }),
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    ]);
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderCode = params.get('orderCode');
    if (params.get('payos') !== 'success' || !orderCode) return;
    endpoints.syncPayosPayment(orderCode)
      .then(async () => {
        setTopupMessage('payOS đã xác nhận nạp ví thành công.');
        await refreshMoneyData();
      })
      .catch((error) => setTopupMessage(error instanceof Error ? error.message : 'Chưa thể xác nhận giao dịch payOS'));
  }, []);
  const topUpWallet = useMutation({
    mutationFn: () => endpoints.topUpWallet({ amount: Number(topupAmount) }),
    onSuccess: (result: any) => {
      if (result?.checkoutUrl) window.location.href = result.checkoutUrl;
    },
    onError: (error) => setTopupMessage(error instanceof Error ? error.message : 'Không thể tạo giao dịch nạp ví')
  });

  return (
    <Dashboard title="Nạp tiền vào ví">
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <Input type="number" min="10000" step="1000" placeholder="Số tiền nạp tối thiểu 10.000đ" value={topupAmount} onChange={(event) => setTopupAmount(event.target.value)} />
          <Button disabled={topUpWallet.isPending} onClick={() => topUpWallet.mutate()}>
            {topUpWallet.isPending ? 'Đang tạo...' : 'Nạp ví qua payOS'}
          </Button>
        </div>
        {topupMessage && <p className="mt-3 text-sm text-muted">{topupMessage}</p>}
      </Card>
    </Dashboard>
  );
}

export function WalletWithdrawPage() {
  const queryClient = useQueryClient();
  const { data: withdrawals = [] } = useQuery({ queryKey: ['withdrawals'], queryFn: endpoints.withdrawals });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bankName: '', toAccountNumber: '', toAccountName: '' });
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [transferInstruction, setTransferInstruction] = useState<any>(null);
  const refreshMoneyData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['tx'] }),
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    ]);
  };
  const createWithdrawal = useMutation({
    mutationFn: () => endpoints.createWithdrawal({
      amount: Number(withdrawForm.amount),
      accountInfo: {
        bankName: withdrawForm.bankName,
        toAccountNumber: withdrawForm.toAccountNumber,
        toAccountName: withdrawForm.toAccountName
      }
    }),
    onSuccess: async (result: any) => {
      setTransferInstruction(result.transferInstruction || null);
      setWithdrawMessage('Đã gửi yêu cầu rút tiền. Casso sẽ tự xác nhận khi ngân hàng ghi nhận giao dịch chuyển ra.');
      setWithdrawForm({ amount: '', bankName: '', toAccountNumber: '', toAccountName: '' });
      await refreshMoneyData();
    },
    onError: (error) => setWithdrawMessage(error instanceof Error ? error.message : 'Không thể rút tiền')
  });
  const syncWithdrawal = useMutation({
    mutationFn: (id: string) => endpoints.syncWithdrawal(id),
    onSuccess: refreshMoneyData,
    onError: (error) => setWithdrawMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái rút tiền')
  });
  const setWithdrawField = (key: keyof typeof withdrawForm, value: string) => setWithdrawForm((current) => ({ ...current, [key]: value }));
  return (
    <Dashboard title="Rút tiền">
      <Section title="Thông tin tài khoản nhận">
          <Card>
            <div className="grid gap-3 md:grid-cols-4">
              <Input type="number" min="1000" placeholder="Số tiền" value={withdrawForm.amount} onChange={(event) => setWithdrawField('amount', event.target.value)} />
              <Select value={withdrawForm.bankName} onChange={(event) => setWithdrawField('bankName', event.target.value)}>
                <option value="">Chọn ngân hàng</option>
                {bankOptions.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              </Select>
              <Input placeholder="Số tài khoản" value={withdrawForm.toAccountNumber} onChange={(event) => setWithdrawField('toAccountNumber', event.target.value)} />
              <Input placeholder="Tên tài khoản" value={withdrawForm.toAccountName} onChange={(event) => setWithdrawField('toAccountName', event.target.value)} />
            </div>
            <Button className="mt-4" disabled={createWithdrawal.isPending} onClick={() => createWithdrawal.mutate()}>
              {createWithdrawal.isPending ? 'Đang xử lý...' : 'Rút tiền'}
            </Button>
            {withdrawMessage && <p className="mt-3 text-sm text-muted">{withdrawMessage}</p>}
            {transferInstruction && (
              <div className="mt-4 rounded-lg bg-soft p-4 text-sm">
                <p className="font-semibold">Mã đối soát: {transferInstruction.content}</p>
                <p className="mt-1 text-muted">Admin chuyển đúng số tiền vào tài khoản bạn đã nhập và dùng mã này trong nội dung chuyển khoản để Casso tự đánh dấu đã chi.</p>
              </div>
            )}
          </Card>
      </Section>

      {withdrawals.length > 0 && (
        <Section title="Yêu cầu rút tiền">
          {withdrawals.map((item: any) => (
            <Card key={item._id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.amount?.toLocaleString('vi-VN')}đ</p>
                  <p className="text-sm text-muted">{item.referenceId} · {item.accountInfo?.bankName || item.accountInfo?.toBin} - {item.accountInfo?.toAccountNumber} - {item.accountInfo?.toAccountName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  {item.method === 'payos' ? (
                    <Button variant="secondary" disabled={syncWithdrawal.isPending || !item.payoutId} onClick={() => syncWithdrawal.mutate(item._id)}>Cập nhật</Button>
                  ) : (
                    <span className="text-sm text-muted">Chờ webhook Casso</span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </Section>
      )}

    </Dashboard>
  );
}

export function ReviewsPage() {
  return <Dashboard title="Đánh giá"><Card><Textarea placeholder="Viết đánh giá cho designer" /><Select className="mt-3"><option>5 sao</option><option>4 sao</option></Select><Button className="mt-3">Gửi đánh giá</Button></Card></Dashboard>;
}

export function SettingsPage() {
  const { updateUser } = useAuth();
  const { data } = useQuery({ queryKey: ['my-account'], queryFn: endpoints.myAccount });
  const [form, setForm] = useState({ name: '', email: '', phone: '', avatar: '', dateOfBirth: '' });
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!data?.user) return;
    setForm({
      name: data.user.name || '',
      email: data.user.email || '',
      phone: data.user.phone || '',
      avatar: data.user.avatar || '',
      dateOfBirth: data.user.dateOfBirth ? data.user.dateOfBirth.slice(0, 10) : ''
    });
  }, [data?.user]);
  const save = useMutation({
    mutationFn: () => endpoints.updateMe({ ...form, dateOfBirth: form.dateOfBirth || null }),
    onSuccess: (user) => {
      updateUser(user);
      setMessage('Đã cập nhật tài khoản');
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể cập nhật tài khoản')
  });
  const setField = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  return (
    <Dashboard title="Tài khoản">
      <Card>
        <div className="mb-5 flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-soft">{form.avatar ? <img className="h-full w-full object-cover" src={form.avatar} alt={form.name} /> : null}</div>
          <div><h2 className="text-xl font-black">{form.name || 'Tài khoản VESD'}</h2><p className="text-sm text-muted">{data?.user?.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}</p></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input placeholder="Tên hiển thị" value={form.name} onChange={(event) => setField('name', event.target.value)} />
          <Input type="email" placeholder="Gmail" value={form.email} onChange={(event) => setField('email', event.target.value)} />
          <Input placeholder="Đường dẫn avatar" value={form.avatar} onChange={(event) => setField('avatar', event.target.value)} />
          <Input type="date" value={form.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} />
          <Input placeholder="Số điện thoại" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
          <Select><option>Bật thông báo email</option><option>Tắt</option></Select>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}</Button>
        </div>
        {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      </Card>
    </Dashboard>
  );
}

export function ChangePasswordPage() {
  const [message, setMessage] = useState('');
  const change = useMutation({
    mutationFn: (body: unknown) => endpoints.changePassword(body),
    onSuccess: () => setMessage('Đã đổi mật khẩu'),
    onError: (error) => setMessage(error instanceof Error ? error.message : 'Không thể đổi mật khẩu')
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    change.mutate({ currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') });
  }
  return <Dashboard title="Đổi mật khẩu"><Card><form className="grid gap-4 md:max-w-md" onSubmit={submit}><Input name="currentPassword" type="password" placeholder="Mật khẩu hiện tại" /><Input name="newPassword" type="password" placeholder="Mật khẩu mới" /><Button disabled={change.isPending}>{change.isPending ? 'Đang cập nhật...' : 'Đổi mật khẩu'}</Button></form>{message && <p className="mt-3 text-sm text-muted">{message}</p>}</Card></Dashboard>;
}
