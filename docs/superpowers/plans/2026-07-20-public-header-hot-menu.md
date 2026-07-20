# Public Header “Đang Hot” Implementation Plan

> **For agent:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Chỉnh Header công khai và mega-menu desktop khớp 100% ảnh Figma đã duyệt, đồng thời giữ nguyên mọi route và luồng theo trạng thái đăng nhập.

**Architecture:** Giữ `PublicHeader` là điểm tích hợp duy nhất nhưng tách dữ liệu trình bày desktop thành cấu trúc bốn cột có section lồng. Điều khiển trạng thái mega-menu bằng state rõ ràng cho hover, focus và bàn phím; menu mobile tiếp tục dùng dữ liệu hiện tại để cô lập hồi quy. Kiểm thử theo ba lớp: contract dữ liệu/slug, tương tác component và visual QA trên trình duyệt.

**Tech Stack:** React 18, TypeScript, React Router 7, Tailwind CSS 3, Vitest 2, Testing Library, jsdom, Vite 6.

---

## Điều kiện đầu vào và mốc so sánh

- Đặc tả đã duyệt: `docs/superpowers/specs/2026-07-20-public-header-hot-menu-design.md`.
- Ảnh chuẩn: `C:/Users/nguye/AppData/Local/Temp/codex-clipboard-709b0f61-b386-43c3-a4ce-6a193163f999.png`.
- Trang kiểm tra: `http://localhost:5173/`.
- Baseline hiện tại: `npm test` đạt 13/13 trước khi sửa.
- Không sửa route `/services/:slug`, `PublicLayout`, API hoặc database.

### Task 1: Thiết lập test tương tác cho Header

**Files:**

- Modify: `vesd/client/package.json`
- Modify: `vesd/client/package-lock.json`
- Create: `vesd/client/src/components/layout/public/PublicHeader.test.tsx`

**Step 1: Cài test dependencies tối thiểu**

Run:

```bash
cd vesd/client
npm install --save-dev @testing-library/react @testing-library/user-event jsdom
```

Expected: `package.json` và lockfile chỉ thêm ba dev dependencies; không đổi dependency runtime.

**Step 2: Tạo test smoke đang thất bại cho nhãn mới**

Tạo helper render Header trong `MemoryRouter`, mock `useAuth` ở trạng thái khách và thêm chỉ thị môi trường jsdom ở đầu file:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PublicHeader } from './PublicHeader';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() })
}));

function renderHeader() {
  return render(<MemoryRouter><PublicHeader /></MemoryRouter>);
}

it('uses the approved Đang Hot trigger', () => {
  renderHeader();
  expect(screen.getByRole('button', { name: /Đang Hot/i })).toBeTruthy();
});
```

**Step 3: Chạy test để xác nhận đỏ đúng nguyên nhân**

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: FAIL vì Header hiện vẫn hiển thị `Danh mục`.

**Step 4: Commit test harness**

```bash
git add vesd/client/package.json vesd/client/package-lock.json vesd/client/src/components/layout/public/PublicHeader.test.tsx
git commit -m "test: add public header interaction coverage"
```

### Task 2: Khóa contract dữ liệu bốn cột đúng mẫu

**Files:**

- Modify: `vesd/client/src/components/layout/public/PublicHeader.test.tsx`
- Modify: `vesd/client/src/components/layout/public/publicNavigation.ts`

**Step 1: Viết test dữ liệu đang thất bại**

Import export mới `desktopHotMenuColumns` và kiểm tra:

```tsx
expect(desktopHotMenuColumns).toHaveLength(4);
expect(desktopHotMenuColumns.map((column) => column.sections[0].title)).toEqual([
  'Thiết kế thương hiệu (Branding)',
  'Thiết kế UI / UX',
  'Thiết kế đồ họa (Graphic Design)',
  'Thiết kế 3D'
]);
expect(desktopHotMenuColumns[0].sections[1]).toEqual({
  title: 'Khác',
  items: [
    { label: 'Khám phá thêm', slug: 'kham-pha-them' },
    { label: 'Yêu cầu thêm danh mục', slug: 'yeu-cau-them-danh-muc' }
  ]
});
```

Thêm assertion toàn bộ item của bốn cột đúng nguyên văn đặc tả, và xác nhận không có ba tiêu đề bị loại.

**Step 2: Chạy test để xác nhận đỏ**

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: FAIL vì `desktopHotMenuColumns` chưa tồn tại.

**Step 3: Thêm kiểu dữ liệu và cấu hình desktop**

Trong `publicNavigation.ts`, giữ nguyên `hotMenu` cho mobile và thêm cấu trúc riêng:

```ts
export type HeaderMenuSection = {
  title: string;
  items: Array<{ label: string; slug: string }>;
};

export type HeaderMenuColumn = {
  sections: HeaderMenuSection[];
};

export const desktopHotMenuColumns: HeaderMenuColumn[] = [
  {
    sections: [
      {
        title: 'Thiết kế thương hiệu (Branding)',
        items: [
          { label: 'Thiết kế Logo', slug: 'thiet-ke-logo' },
          { label: 'Thiết kế Brand Identity', slug: 'bo-nhan-dien-thuong-hieu' },
          { label: 'Thiết kế Brand Guidelines', slug: 'quy-chuan-thuong-hieu' },
          { label: 'Thiết kế Logo animation', slug: 'hoat-anh-logo' },
          { label: 'Thiết kế Business card', slug: 'danh-thiep' },
          { label: 'Thiết kế Brand kit', slug: 'bo-tai-san-thuong-hieu' },
          { label: 'Thiết kế Letterhead', slug: 'tieu-de-thu' }
        ]
      },
      {
        title: 'Khác',
        items: [
          { label: 'Khám phá thêm', slug: 'kham-pha-them' },
          { label: 'Yêu cầu thêm danh mục', slug: 'yeu-cau-them-danh-muc' }
        ]
      }
    ]
  },
  // Cột UI/UX, Graphic Design và 3D đúng đặc tả.
];
```

Không xóa `hotMenu` vì menu mobile đang phụ thuộc vào export này.

**Step 4: Test contract và slug**

Thêm bảng test cho slug cũ được giữ khi nhãn hiển thị đổi:

```tsx
expect(findDesktopItem('Thiết kế Website UI')?.slug).toBe('thiet-ke-giao-dien-website');
expect(findDesktopItem('3D Product Render')?.slug).toBe('render-san-pham-3d');
expect(findDesktopItem('3D Game Asset')?.slug).toBe('asset-game-3d');
```

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: PASS phần contract dữ liệu và slug; test nhãn Header vẫn FAIL.

**Step 5: Commit dữ liệu menu**

```bash
git add vesd/client/src/components/layout/public/publicNavigation.ts vesd/client/src/components/layout/public/PublicHeader.test.tsx
git commit -m "feat: define approved desktop hot menu"
```

### Task 3: Thay markup Header và giữ nguyên luồng điều hướng

**Files:**

- Modify: `vesd/client/src/components/layout/public/PublicHeader.tsx:1-116`
- Modify: `vesd/client/src/components/layout/public/PublicHeader.test.tsx`

**Step 1: Viết test render đang thất bại**

Kiểm tra:

- Trigger có tên `Đang Hot` và `aria-expanded="false"` ban đầu.
- Có đúng bốn phần tử cột `data-testid="hot-menu-column"`.
- Branding và `Khác` cùng nằm trong cột đầu.
- Không render `AI và công nghệ mới`, `Minh họa và nghệ thuật`, `Chuyển động` trong desktop panel.
- Link `Thiết kế Website UI` có href `/services/thiet-ke-website-ui`.
- Link `3D Game Asset` có href `/services/3d-game-asset`.

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: FAIL do component vẫn map `hotMenu` tám nhóm.

**Step 2: Đổi nguồn dữ liệu và markup**

- Import `desktopHotMenuColumns` bên cạnh `hotMenu`.
- Đổi text trigger thành `Đang Hot`.
- Render `column.sections`, nhờ đó nhóm `Khác` nằm dưới Branding trong cùng cột.
- Desktop dùng `item.label` làm text và `item.slug` làm href để nhãn đúng Figma nhưng URL cũ không đổi.
- Mobile tiếp tục dùng `serviceSlug(item)` với `hotMenu` hiện tại.
- Không sửa cách tính `jobsPath`, `projectsPath`, `messagesPath`, `accountPath`, `passwordPath`.
- Thêm test id chỉ ở wrapper cột, không thêm hook kiểm thử vào logic ứng dụng.

**Step 3: Chạy test render**

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: PASS các assertion nội dung và href.

**Step 4: Chạy build sớm để bắt lỗi TypeScript**

Run:

```bash
npm run build
```

Expected: exit 0, không có lỗi import/type.

**Step 5: Commit markup**

```bash
git add vesd/client/src/components/layout/public/PublicHeader.tsx vesd/client/src/components/layout/public/PublicHeader.test.tsx
git commit -m "feat: render four-column hot menu"
```

### Task 4: Hoàn thiện tương tác hover, focus và Escape

**Files:**

- Modify: `vesd/client/src/components/layout/public/PublicHeader.tsx`
- Modify: `vesd/client/src/components/layout/public/PublicHeader.test.tsx`

**Step 1: Viết test tương tác đang thất bại**

Dùng `userEvent` để kiểm tra:

```tsx
const user = userEvent.setup();
const trigger = screen.getByRole('button', { name: /Đang Hot/i });

await user.click(trigger);
expect(trigger.getAttribute('aria-expanded')).toBe('true');

await user.keyboard('{Escape}');
expect(trigger.getAttribute('aria-expanded')).toBe('false');
expect(document.activeElement).toBe(trigger);
```

Thêm test `focus` mở menu, `Tab` vào link không đóng menu, và pointer rời toàn bộ vùng trigger/panel mới đóng.

**Step 2: Chạy test để xác nhận đỏ**

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: FAIL vì desktop menu hiện là CSS `group-hover` và chưa có state/ARIA.

**Step 3: Cài đặt state truy cập được**

- Thêm `desktopMenuOpen`, ref cho trigger và `suppressNextFocusRef`.
- Wrapper chung nhận `onMouseEnter`/`onMouseLeave` để không có khe hover.
- `onFocusCapture` mở; `onBlurCapture` chỉ đóng khi focus rời toàn wrapper.
- Click trigger luôn mở menu để không xung đột với sự kiện focus chạy trước click; đóng bằng Escape, rời vùng hoặc chuyển focus ra ngoài.
- Listener Escape chỉ hoạt động khi menu đang mở. Trước khi focus lại trigger, đặt `suppressNextFocusRef`; lần `focus` khôi phục này không được mở lại menu. Cleanup listener trong effect.
- `aria-expanded`, `aria-controls`, `aria-haspopup="true"`; panel có id ổn định.
- Dùng state để quyết định `visible/opacity/pointer-events`, không giữ hai nguồn trạng thái CSS và React mâu thuẫn.

**Step 4: Chạy test**

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: PASS toàn bộ test Header.

**Step 5: Commit interaction**

```bash
git add vesd/client/src/components/layout/public/PublicHeader.tsx vesd/client/src/components/layout/public/PublicHeader.test.tsx
git commit -m "feat: make hot menu keyboard accessible"
```

### Task 5: Khớp giao diện Header và mega-menu với ảnh chuẩn

**Files:**

- Modify: `vesd/client/src/components/layout/public/PublicHeader.tsx:36-92`
- Modify: `vesd/client/src/styles/index.css:191-195`

**Step 1: Chụp baseline cùng viewport**

- Mở `http://localhost:5173/` ở trạng thái khách.
- Dùng viewport chuẩn `930 × 364` để đối chiếu ảnh PNG `930 × 364`; nếu kiểm tra ở độ phân giải triển khai gấp đôi, giữ cùng tỷ lệ `2.5549:1` và chuẩn hóa ảnh về `930 × 364` trước khi diff.
- Mở `Đang Hot`, chụp Header và panel.
- Lưu ảnh baseline tạm ngoài source tree; không commit ảnh tạm.

Expected: thấy rõ sai khác trước khi chỉnh về chiều cao Header, logo, trục cột, cỡ chữ và panel.

**Step 2: Chỉnh thanh Header theo mẫu**

Trong `PublicHeader.tsx`:

- Giữ nền `brand` (`#2453D6`) và chữ trắng.
- Hiệu chỉnh chiều cao Header theo tỷ lệ ảnh chuẩn.
- Hiệu chỉnh logo về đúng tỷ lệ, không bóp méo.
- Dùng bố cục ba vùng: logo, nav trung tâm, action bên phải để các mốc không lệch theo trạng thái user.
- Căn khoảng cách `Thuê Freelancer`, `Tìm việc`, `Đang Hot`, `Dự án` theo ảnh.
- Đặt Search, Mail, UserRound đúng kích thước nét và khoảng cách trong mẫu.
- Trạng thái đã đăng nhập giữ Avatar hiện có trong cùng hộp kích thước của UserRound.

**Step 3: Chỉnh mega-menu theo mẫu**

- Panel bắt đầu đúng mép dưới Header và phủ ngang giống ảnh.
- Bỏ border/shadow hiện tại nếu visual diff xác nhận mẫu không có.
- Inner container dùng đúng trục với Header; bốn cột đặt tại các mốc tương ứng ảnh.
- Giảm typography từ kích thước hiện tại về tỷ lệ mẫu: tiêu đề xanh rõ hơn body nhưng không đậm/quá lớn.
- Chỉnh line-height, khoảng cách item, khoảng cách từ Header xuống tiêu đề và khoảng cách giữa Branding với `Khác`.
- Giữ khoảng trắng phía dưới đúng mẫu; không kéo nhóm khác vào vùng này.
- Dùng class riêng như `.public-hot-menu-panel` và `.public-hot-menu-grid` trong `index.css` nếu utility dài hoặc cần breakpoint chính xác.

**Step 4: Visual-diff lặp có kiểm soát**

Tại cùng viewport:

1. Chụp kết quả.
2. Overlay với ảnh chuẩn ở opacity 50% hoặc dùng công cụ so sánh pixel.
3. Chỉ hiệu chỉnh theo thứ tự: khung tổng → trục ngang → typography → khoảng cách dọc → icon.
4. Lặp đến khi không còn sai khác nhìn thấy.

Không thay đổi nội dung hoặc luồng để chữa sai khác bố cục.

**Step 5: Kiểm tra ba viewport**

- Viewport chuẩn theo ảnh: phải pixel-match.
- Desktop hẹp ngay trên breakpoint `md`: không tràn hoặc chồng cột.
- Desktop rộng: nội dung giữ trục và tỷ lệ hợp lý, panel phủ ngang đúng thiết kế.

**Step 6: Build và commit styling**

Run:

```bash
npm run build
```

Expected: exit 0.

```bash
git add vesd/client/src/components/layout/public/PublicHeader.tsx vesd/client/src/styles/index.css
git commit -m "style: match public header to approved design"
```

### Task 6: Bảo toàn mobile và luồng theo vai trò

**Files:**

- Modify: `vesd/client/src/components/layout/public/PublicHeader.tsx:93-113`
- Modify: `vesd/client/src/components/layout/public/PublicHeader.test.tsx`

**Step 1: Viết test hồi quy mobile/route**

Kiểm tra markup mobile vẫn có:

- `Thuê Freelancer`, `Tìm việc`, `Dự án`.
- Nhãn section đổi từ `Danh mục` thành `Đang Hot`.
- Các nút dịch vụ mobile vẫn gọi `/services/:slug`.
- Hamburger giữ `aria-expanded` độc lập với desktop mega-menu.

Thêm test table cho trạng thái khách/designer/client bằng mock `useAuth` để khóa:

- Khách: Tìm việc/Dự án dẫn tới luồng đăng ký hiện tại; Mail/User dẫn tới đăng nhập.
- Designer: Tìm việc, Dự án, Tin nhắn giữ route `/designer/...`.
- Client: Dự án và Tin nhắn giữ route `/client/...`.

**Step 2: Chạy test để xác nhận sai khác duy nhất**

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: FAIL ở nhãn mobile nếu vẫn là `Danh mục`; các contract route cũ phải không phát hiện thay đổi ngoài ý muốn.

**Step 3: Đồng bộ nhãn mobile, không đổi bố cục**

Đổi đúng text section thành `Đang Hot`. Không áp dụng grid bốn cột desktop cho mobile và không thay `hotMenu.slice(0, 2)` trong task này.

**Step 4: Chạy test và commit**

Run:

```bash
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: PASS.

```bash
git add vesd/client/src/components/layout/public/PublicHeader.tsx vesd/client/src/components/layout/public/PublicHeader.test.tsx
git commit -m "test: preserve public header navigation flows"
```

### Task 7: Xác minh toàn bộ trước khi bàn giao

**Files:**

- Verify only; chỉ sửa các file trên nếu phát hiện lỗi thuộc phạm vi.

**Step 1: Chạy test Header độc lập**

```bash
cd vesd/client
npx vitest run src/components/layout/public/PublicHeader.test.tsx
```

Expected: tất cả test Header PASS.

**Step 2: Chạy toàn bộ test**

```bash
npm test
```

Expected: 13 test cũ và toàn bộ test Header mới PASS; không có regression mới.

**Step 3: Chạy build production**

```bash
npm run build
```

Expected: TypeScript và Vite build exit 0.

**Step 4: QA trực tiếp trên ứng dụng**

Trên `http://localhost:5173/`:

- Mở/đóng `Đang Hot` bằng hover, click, Tab và Escape.
- Click ít nhất một link ở mỗi cột và hai link trong `Khác`.
- Kiểm tra `/`, `/designers`, một `/services/:slug`, `/login`, `/register`.
- Kiểm tra console không có lỗi mới.
- Kiểm tra mobile hamburger và desktop breakpoint.
- Kiểm tra trạng thái khách và ít nhất một tài khoản đăng nhập.

**Step 5: Visual acceptance cuối**

- Chụp trạng thái khách với menu mở ở đúng viewport.
- So sánh cạnh nhau và overlay với ảnh chuẩn.
- Chỉ kết luận hoàn thành khi nội dung, thứ tự, cột, trục căn, kích thước, khoảng cách, màu, icon và khoảng trắng khớp mẫu mà mắt thường không nhận ra sai khác.

**Step 6: Kiểm tra phạm vi diff**

```bash
git status --short
git diff --stat HEAD~5..HEAD
git diff --check HEAD~5..HEAD
```

Expected: chỉ có các file đã liệt kê; không có whitespace error, file tạm hoặc thay đổi API/database.

**Step 7: Review trước khi hợp nhất**

Áp dụng `superpowers:requesting-code-review`, xử lý phát hiện thuộc phạm vi rồi chạy lại Steps 1–6.
