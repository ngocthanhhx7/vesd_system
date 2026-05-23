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
  const { data: bankAccounts = [] } = useQuery({ queryKey: ['bank-accounts'], queryFn: endpoints.bankAccounts });
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', bankName: '', toAccountNumber: '', toAccountName: '', saveAccount: false, label: '' });
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrImage, setQrImage] = useState<any>(null);
  const [withdrawMessage, setWithdrawMessage] = useState('');
  const [transferInstruction, setTransferInstruction] = useState<any>(null);
  const refreshMoneyData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['tx'] }),
      queryClient.invalidateQueries({ queryKey: ['withdrawals'] }),
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    ]);
  };
  const selectedAccount = bankAccounts.find((account: any) => account._id === selectedAccountId);
  const createBankAccount = useMutation({
    mutationFn: async () => {
      const uploadedQr = qrFile ? await endpoints.uploadImage(qrFile) : qrImage;
      return endpoints.createBankAccount({
        label: withdrawForm.label || `${withdrawForm.bankName} ${withdrawForm.toAccountNumber}`,
        bankName: withdrawForm.bankName,
        accountNumber: withdrawForm.toAccountNumber,
        accountName: withdrawForm.toAccountName,
        qrImage: uploadedQr,
        isDefault: bankAccounts.length === 0
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setWithdrawMessage('Đã lưu tài khoản ngân hàng.');
    },
    onError: (error) => setWithdrawMessage(error instanceof Error ? error.message : 'Không thể lưu tài khoản')
  });
  const deleteBankAccount = useMutation({
    mutationFn: (id: string) => endpoints.deleteBankAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bank-accounts'] }),
    onError: (error) => setWithdrawMessage(error instanceof Error ? error.message : 'Không thể xóa tài khoản')
  });
  const createWithdrawal = useMutation({
    mutationFn: async () => {
      const uploadedQr = qrFile ? await endpoints.uploadImage(qrFile) : qrImage;
      return endpoints.createWithdrawal({
        amount: Number(withdrawForm.amount),
        accountInfo: {
          bankAccountId: selectedAccountId || undefined,
          bankName: selectedAccount?.bankName || withdrawForm.bankName,
          toBin: selectedAccount?.bankBin || undefined,
          toAccountNumber: selectedAccount?.accountNumber || withdrawForm.toAccountNumber,
          toAccountName: selectedAccount?.accountName || withdrawForm.toAccountName,
          qrImage: uploadedQr,
          saveAccount: withdrawForm.saveAccount && !selectedAccountId,
          label: withdrawForm.label || undefined
        }
      });
    },
    onSuccess: async (result: any) => {
      setTransferInstruction(result.transferInstruction || null);
      setWithdrawMessage('Đã gửi yêu cầu rút tiền. Casso sẽ tự xác nhận khi ngân hàng ghi nhận giao dịch chuyển ra.');
      setWithdrawForm({ amount: '', bankName: '', toAccountNumber: '', toAccountName: '', saveAccount: false, label: '' });
      setSelectedAccountId('');
      setQrFile(null);
      setQrImage(null);
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
  const setWithdrawBoolean = (key: keyof typeof withdrawForm, value: boolean) => setWithdrawForm((current) => ({ ...current, [key]: value }));
  const chooseSavedAccount = (id: string) => {
    setSelectedAccountId(id);
    const account = bankAccounts.find((item: any) => item._id === id);
    if (!account) return;
    setWithdrawForm((current) => ({
      ...current,
      bankName: account.bankName || '',
      toAccountNumber: account.accountNumber || '',
      toAccountName: account.accountName || '',
      saveAccount: false,
      label: account.label || ''
    }));
    setQrImage(account.qrImage || null);
    setQrFile(null);
  };
  const clearSavedAccount = () => {
    setSelectedAccountId('');
    setWithdrawForm((current) => ({ ...current, bankName: '', toAccountNumber: '', toAccountName: '', label: '', saveAccount: false }));
    setQrImage(null);
    setQrFile(null);
  };
  return (
    <Dashboard title="Rút tiền">
      <Section title="Thông tin tài khoản nhận">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <div className="grid gap-4">
              <div>
                <p className="text-sm font-semibold text-muted">Số tiền rút</p>
                <Input className="mt-2 max-w-sm" type="number" min="1000" placeholder="Nhập số tiền" value={withdrawForm.amount} onChange={(event) => setWithdrawField('amount', event.target.value)} />
              </div>

              <div>
                <p className="text-sm font-semibold text-muted">Tài khoản ngân hàng</p>
                <Select className="mt-2 max-w-xl" value={selectedAccountId} onChange={(event) => event.target.value ? chooseSavedAccount(event.target.value) : clearSavedAccount()}>
                  <option value="">Nhập tài khoản mới</option>
                  {bankAccounts.map((account: any) => (
                    <option key={account._id} value={account._id}>
                      {account.label || account.bankName} - {account.accountNumber}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Select value={withdrawForm.bankName} disabled={Boolean(selectedAccountId)} onChange={(event) => setWithdrawField('bankName', event.target.value)}>
                  <option value="">Chọn ngân hàng</option>
                  {bankOptions.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                </Select>
                <Input disabled={Boolean(selectedAccountId)} placeholder="Số tài khoản" value={withdrawForm.toAccountNumber} onChange={(event) => setWithdrawField('toAccountNumber', event.target.value)} />
                <Input disabled={Boolean(selectedAccountId)} placeholder="Tên chủ tài khoản" value={withdrawForm.toAccountName} onChange={(event) => setWithdrawField('toAccountName', event.target.value)} />
              </div>

              {!selectedAccountId && (
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input placeholder="Tên gợi nhớ, ví dụ Tài khoản Vietcombank" value={withdrawForm.label} onChange={(event) => setWithdrawField('label', event.target.value)} />
                  <label className="flex items-center gap-2 text-base">
                    <input className="h-5 w-5 accent-brand" type="checkbox" checked={Boolean(withdrawForm.saveAccount)} onChange={(event) => setWithdrawBoolean('saveAccount', event.target.checked)} />
                    Lưu tài khoản này
                  </label>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-muted">QR nhận tiền</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Input className="max-w-sm" type="file" accept="image/*" onChange={(event) => setQrFile(event.target.files?.[0] || null)} />
                  {qrFile && <span className="text-sm text-muted">{qrFile.name}</span>}
                  {!qrFile && qrImage?.url && <a className="text-sm font-semibold text-brand" href={qrImage.url} target="_blank" rel="noreferrer">Xem QR đã lưu</a>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button disabled={createWithdrawal.isPending} onClick={() => createWithdrawal.mutate()}>
                  {createWithdrawal.isPending ? 'Đang xử lý...' : 'Gửi yêu cầu rút'}
                </Button>
                {!selectedAccountId && (
                  <Button variant="secondary" disabled={createBankAccount.isPending} onClick={() => createBankAccount.mutate()}>
                    {createBankAccount.isPending ? 'Đang lưu...' : 'Lưu tài khoản'}
                  </Button>
                )}
              </div>
            </div>
            {withdrawMessage && <p className="mt-4 text-sm text-muted">{withdrawMessage}</p>}
            {transferInstruction && (
              <div className="mt-4 rounded-lg bg-soft p-4 text-sm">
                <p className="font-semibold">Mã đối soát: {transferInstruction.content}</p>
                <p className="mt-1 text-muted">Admin chuyển đúng số tiền vào tài khoản đã xác nhận và dùng mã này trong nội dung chuyển khoản để Casso tự đánh dấu đã chi.</p>
              </div>
            )}
          </Card>

          <div className="space-y-3">
            {bankAccounts.map((account: any) => (
              <Card key={account._id} className={selectedAccountId === account._id ? 'border-brand' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{account.label || account.bankName}</p>
                    <p className="text-sm text-muted">{account.bankName}</p>
                    <p className="mt-2 font-semibold">{account.accountNumber}</p>
                    <p className="text-sm text-muted">{account.accountName}</p>
                    {account.qrImage?.url && <a className="mt-2 inline-block text-sm font-semibold text-brand" href={account.qrImage.url} target="_blank" rel="noreferrer">QR đã lưu</a>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button variant="secondary" onClick={() => chooseSavedAccount(account._id)}>Chọn</Button>
                    <Button variant="ghost" disabled={deleteBankAccount.isPending} onClick={() => deleteBankAccount.mutate(account._id)}>Xóa</Button>
                  </div>
                </div>
              </Card>
            ))}
            {!bankAccounts.length && <Card><p className="text-sm text-muted">Chưa có tài khoản ngân hàng đã lưu.</p></Card>}
          </div>
        </div>
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
