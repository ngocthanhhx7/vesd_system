import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDemoSeedData } from '../seed/demoSeedData.js';

const CLIENTS = [
  ['Nguyễn Thùy Linh', 'linh.nguyen1998@gmail.com'],
  ['Trần Minh Khang', 'minh.tran2000@gmail.com'],
  ['Lê Hoài An', 'an.le1999@gmail.com'],
  ['Phạm Ngọc Thảo', 'thao.pham2001@gmail.com'],
  ['Mai Ngọc Khánh', 'ngoc.mai2002@gmail.com'],
  ['Võ Hoàng Nam', 'hoang.vo1997@gmail.com'],
  ['Đặng Thu Hương', 'huong.dang2000@gmail.com'],
  ['Nguyễn Quốc Tuấn', 'tuan.nguyen2003@gmail.com'],
  ['Bùi Khánh Ngân', 'ngan.bui1999@gmail.com'],
  ['Đỗ Diệu Linh', 'dieu.linh2001@gmail.com'],
  ['Trần Bảo Chi', 'bao.chi2002@gmail.com'],
  ['Nguyễn Anh Thư', 'anh.thu1998@gmail.com']
];

const DESIGNERS = [
  ['Lê Thanh Phương', 'phuong.le2000@gmail.com'],
  ['Nguyễn Gia Hân', 'han.nguyen2001@gmail.com'],
  ['Trần Yến Nhi', 'yen.nhi2003@gmail.com'],
  ['Trương Quốc Bình', 'binh.truong1999@gmail.com'],
  ['Vũ Quỳnh Anh', 'quynh.anh2002@gmail.com'],
  ['Phạm Ngọc Hà', 'ngoc.ha2000@gmail.com'],
  ['Nguyễn Gia Huy', 'gia.huy2001@gmail.com'],
  ['Lê Minh Châu', 'minh.chau2002@gmail.com'],
  ['Phan Mai Phương', 'mai.phuong1998@gmail.com'],
  ['Vũ Hoàng Long', 'vu.hoang2000@gmail.com'],
  ['Nguyễn Bảo Ngọc', 'bao.ngoc2003@gmail.com'],
  ['Trần Như Ý', 'nhu.y2001@gmail.com']
];

const GROSS_AMOUNTS = [
  500_000, 600_000, 700_000, 800_000, 550_000, 650_000,
  750_000, 850_000, 450_000, 500_000, 800_000, 850_000
];

test('demo seed fixtures satisfy approved counts and money totals', () => {
  const data = buildDemoSeedData();

  assert.equal(data.clients.length, 12);
  assert.equal(data.designers.length, 12);
  assert.equal(data.completedProjects.length, 12);
  assert.equal(data.openProjects.length, 20);
  assert.equal(data.deposits.length, 12);
  assert.equal(data.releases.length, 12);
  assert.deepEqual(data.completedProjects.map(({ grossAmount }) => grossAmount), GROSS_AMOUNTS);
  assert.equal(data.completedProjects.reduce((sum, item) => sum + item.grossAmount, 0), 8_000_000);
  assert.equal(data.releases.reduce((sum, item) => sum + item.platformFee, 0), 400_000);
  assert.equal(data.releases.reduce((sum, item) => sum + item.amount, 0), 7_600_000);

  data.completedProjects.forEach((project, index) => {
    assert.equal(project.budget.agreed, GROSS_AMOUNTS[index]);
    assert.equal(project.agreement.price, GROSS_AMOUNTS[index]);
    assert.equal(data.deposits[index].amount, GROSS_AMOUNTS[index]);
    assert.equal(data.deposits[index].metadata.escrowAmount, GROSS_AMOUNTS[index]);
    assert.equal(data.releases[index].metadata.grossAmount, GROSS_AMOUNTS[index]);
  });
});

test('accounts use the exact approved identities and roles without usernames', () => {
  const data = buildDemoSeedData();

  assert.equal(data.password, '12345678');
  assert.deepEqual(data.clients.map(({ name, email }) => [name, email]), CLIENTS);
  assert.deepEqual(data.designers.map(({ name, email }) => [name, email]), DESIGNERS);
  assert.ok(data.clients.every((item) => item.roles.length === 1 && item.roles[0] === 'client'));
  assert.ok(data.designers.every((item) => item.roles.length === 1 && item.roles[0] === 'designer'));
  assert.ok([...data.clients, ...data.designers].every((item) => !Object.hasOwn(item, 'username')));
});

test('every fixture id is a unique deterministic ObjectId-shaped value', () => {
  const first = buildDemoSeedData();
  const second = buildDemoSeedData();
  const collections = [
    'clients', 'designers', 'clientProfiles', 'designerProfiles', 'wallets',
    'completedProjects', 'openProjects', 'deposits', 'releases'
  ];
  const firstIds = collections.flatMap((key) => first[key].map(({ _id }) => _id));
  const secondIds = collections.flatMap((key) => second[key].map(({ _id }) => _id));

  assert.deepEqual(firstIds, secondIds);
  assert.ok(firstIds.every((id) => /^[a-f0-9]{24}$/.test(id)));
  assert.equal(new Set(firstIds).size, firstIds.length);
});

test('completed transactions are dated in range and paired to their projects', () => {
  const data = buildDemoSeedData();
  const from = Date.parse('2026-06-30T00:00:00.000Z');
  const through = Date.parse('2026-07-14T23:59:59.999Z');

  for (let index = 0; index < data.completedProjects.length; index += 1) {
    const project = data.completedProjects[index];
    const deposit = data.deposits[index];
    const release = data.releases[index];
    assert.equal(project.status, 'completed');
    assert.equal(deposit.projectId, project._id);
    assert.equal(release.projectId, project._id);
    assert.equal(deposit.type, 'deposit');
    assert.equal(release.type, 'release');
    assert.equal(deposit.status, 'success');
    assert.equal(release.status, 'success');
    assert.ok(Date.parse(release.createdAt) >= from && Date.parse(release.createdAt) <= through);
  }
});

test('open projects are varied, natural listings with no assigned designer', () => {
  const { openProjects } = buildDemoSeedData();
  const categories = new Set(openProjects.map(({ category }) => category));

  assert.ok(openProjects.every((item) => item.status === 'pending_designer'));
  assert.ok(openProjects.every((item) => !Object.hasOwn(item, 'designerId')));
  assert.ok(openProjects.every((item) => item.description.length >= 80));
  assert.ok(openProjects.every((item) => item.deliverables.length >= 2));
  assert.equal(new Set(openProjects.map(({ title }) => title)).size, 20);
  assert.ok(categories.size >= 6);
});
