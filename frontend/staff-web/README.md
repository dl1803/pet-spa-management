# Web Nhân viên

Ứng dụng Next.js độc lập cho lễ tân và nhân viên spa.
Khởi tạo TypeScript, TailwindCSS, Axios, TanStack Query và React Hook Form.

Yêu cầu Node.js >= 20.9 và npm. Chạy các lệnh sau tại `frontend/staff-web`:

```powershell
npm ci
npm run dev -- --port 3001
```

Mở http://localhost:3001. Cần backend đang chạy và một tài khoản nhân viên do Quản lý tạo; chưa đăng nhập thì mọi đường dẫn chuyển về `/dang-nhap`. Sau đăng nhập, trang gốc chỉ giới thiệu ứng dụng; các màn Lịch sử công việc (`/lich-su-cong-viec`), Thông báo (`/thong-bao`) và Thực hiện dịch vụ (`/lich-hen/[appointmentId]/thuc-hien`) của Nhân viên spa dùng dữ liệu mô phỏng, chưa kết nối backend. Màn Thực hiện dịch vụ chưa có menu; mở bằng đường dẫn trực tiếp với mã lịch mô phỏng trong `features/service-execution/mock-data.ts`. Dữ liệu mô phỏng gồm 3 lịch đang xử lý và 8 lịch Hoàn tất khớp màn Lịch sử công việc. Lịch đang thực hiện có nút “Hoàn tất lịch hẹn”, khóa tới khi xong mọi dịch vụ và có ảnh sau chăm sóc; hoàn tất xong màn chuyển sang Lịch sử công việc, lịch vừa hoàn tất chưa hiện ở đó vì dữ liệu mô phỏng cố định. Nút “Xem” mở lịch Hoàn tất ở chế độ chỉ xem. Màn Lịch hẹn của Lễ tân (`/lich-hen`) cũng dùng dữ liệu mô phỏng (chỉ có lịch cho ngày hôm nay); mục menu “Lịch hẹn” chưa bật vì dùng chung với Nhân viên spa. Màn Đặt lịch thay khách của Lễ tân (`/dat-lich`) có tab Lưu trú dùng dữ liệu mô phỏng, mở bằng `/dat-lich?type=Hotel&customerId=c2000000-0000-4000-8000-000000000001`; tab Lịch spa chưa khả dụng. Màn Tiếp nhận của Lễ tân (`/tiep-nhan`) dùng dữ liệu mô phỏng cho phần ghi nhận cân nặng thực tế và phản hồi chi phí mới; mở bằng nút “Tiếp nhận” ở màn Lịch hẹn hoặc bằng `?appointmentId=` với lịch spa Bông `a1000000-0000-4000-8000-000000000001`, lịch spa Mướp đang chờ khách xác nhận `a1000000-0000-4000-8000-000000000003`, lịch lưu trú Cốm `a1000000-0000-4000-8000-000000000004`. Cân nặng 11,2 kg của Bông cần khách xác nhận chi phí; cân nặng 77 kg và 88 kg mô phỏng lỗi hết giữ chỗ và mất mạng. Màn Khách hàng của Lễ tân (/khach-hang) dùng dữ liệu mô phỏng, tìm bằng một phần số điện thoại: 0962345118 (Ngô Thanh Bình, 3 thú cưng, 1 lịch spa hoàn tất), 0903412678 (Trần Minh Anh, 2 thú cưng, có email, 2 lịch hẹn gần đây: Mochi 14:00 Chờ xác nhận và Bông 09:00 Đã xác nhận), 0912345678 (Trần Mỹ Linh, chưa có thú cưng, chưa có lịch hẹn), 0935123456 (bị khóa tự đặt lịch); số chưa có (ví dụ 0988123456) mở form khách vãng lai; ghi nhận bằng số đã có thì báo trùng liên hệ; số 0999999999 mô phỏng mất mạng (hiện lỗi sau vài lần thử lại). Khách đang phục vụ được giữ trong sessionStorage của tab (khóa ps.servingCustomer). Liên kết “Đặt lịch thay” chỉ tìm thấy hai khách có sẵn ở màn Đặt lịch thay (Ngô Thanh Bình, Trần Mỹ Linh); khách mới ghi nhận chưa dùng được ở đó cho tới khi nối API thật. Màn Hồ sơ thú cưng của Lễ tân (/khach-hang/[customerId]/thu-cung/them và /khach-hang/[customerId]/thu-cung/[petId]) cần khách đang phục vụ (chọn ở màn Khách hàng); mở thẳng khi chưa chọn khách thì báo “Chưa chọn khách hàng”. Ở form, cân nặng 77 kg và 88 kg mô phỏng lỗi dữ liệu không hợp lệ và mất mạng. Màn Thanh toán tại quầy của Lễ tân (`/thanh-toan`) dùng dữ liệu mô phỏng gồm 4 khoản chưa thu: tiền lưu trú của Cốm và Bông, phí trả muộn của Mướp, khoản spa của Gạo; mở bằng đường dẫn trực tiếp hoặc `?appointmentId=` với mã lịch mô phỏng `a2800001-0000-4000-8000-000000000001` đến `a2800004-0000-4000-8000-000000000001`. Ghi nhận xong thì khoản biến mất khỏi danh sách; tải lại trang thì dữ liệu về ban đầu. Mã QR chỉ là hình minh họa và tài khoản ngân hàng trong `lib/store-info.ts` là giá trị minh họa chờ nhóm chốt.
Dừng server bằng Ctrl+C trong terminal đã khởi chạy.

Ứng dụng dùng Be Vietnam Pro và token màu chung với Web Khách hàng, Web Quản lý (`app/globals.css`).
Lễ tân và Nhân viên spa dùng chung một khung: thanh trên nền `lagoon-700` cao 64px, nội dung tối đa 1320px.
Dưới 980px menu cuộn ngang được; dưới 640px menu chỉ còn biểu tượng (nhãn vẫn có cho trình đọc màn hình).
Liên kết “Đến nội dung chính” hỗ trợ bàn phím.

Menu hiển thị theo vai trò: Lễ tân có Lịch hẹn, Tiếp nhận, Trả thú cưng, Khách hàng, Đặt lịch thay, Chuồng,
Thanh toán; Nhân viên spa có Lịch hẹn, Lịch sử công việc, Dịch vụ và nút Thông báo. Menu tài khoản có Hồ sơ cá nhân,
Danh mục dịch vụ (chỉ Lễ tân) và Đăng xuất. `(main)/layout.tsx` dùng `SessionSiteHeader`: trong lúc khôi phục phiên khung chỉ hiện
logo và ô “Đang tải…”, chưa hiện mục menu nào; có phiên thì truyền vai trò thật (`staffRole` của `GET /me`) vào `SiteHeader`.
Mọi mục chưa có trang đích bị vô hiệu hóa, có mô tả “Chức năng chưa khả dụng”; bật `available` trong
`components/layout/header-nav.tsx` khi trang đích đã có. Người làm trang mới được phép sửa duy nhất cờ `available` trong
`header-nav.tsx` để bật menu của trang mình. Không sửa phần khác của shell. Nút Đăng xuất chỉ hoạt động khi `HeaderNav` nhận `onLogout` (`SessionSiteHeader` truyền vào). Đã bật: Lịch sử công việc và Thông báo của Nhân viên spa, Khách hàng, Đặt lịch thay, Tiếp nhận và Thanh toán của Lễ tân.

- `app/(main)`: layout có thanh trên, `SessionGate` và trang giới thiệu.
- `app/(auth)/dang-nhap`: màn Đăng nhập nhân viên, không có khung; `features/auth` chứa form và màn hình.
- `app/api/session/{login,refresh,logout}`, `proxy.ts`, `lib/auth`: phiên đăng nhập (xem mục “Đăng nhập và phiên”).
- `components/layout`: thanh trên, menu theo vai trò, menu tài khoản; phần đọc đường dẫn nằm trong `Suspense`.
- `components/icons.tsx`: biểu tượng SVG và logo theo UI demo.
- `lib/routes.ts`: đường dẫn các màn của Web Nhân viên.
- `lib/api/types.ts`, `lib/labels.ts`: vai trò nhân viên (`Receptionist`, `SpaStaff`), lịch hẹn, thú cưng, ảnh lịch hẹn, thông báo và nhãn tiếng Việt.
- `lib/api`: Axios client và chuẩn hóa lỗi thành `ApiError`; đủ 25 mã lỗi, cùng nội dung với Web Quản lý.
- `app/providers.tsx`, `lib/query-client.ts`: Query Provider và cấu hình retry; cache server tách riêng, trình duyệt giữ cùng client.
- `components/feedback`: lỗi nội tuyến, cảnh báo nghiệp vụ, lỗi trường, trạng thái không có quyền và toast.
- `components/ui`, `components/domain`, `components/layout/page-header.tsx`: thành phần giao diện dùng chung, sao chép từ Web Khách hàng (riêng `pet-avatar.tsx` từ Web Quản lý); `button.tsx`, `select.tsx` theo vùng chạm 44px của Web Nhân viên.
- `features/work-history`, `features/notifications`, `features/service-execution`: màn Lịch sử công việc, Thông báo và Thực hiện dịch vụ; dữ liệu mô phỏng nằm trong `mock-data.ts`.
- `features/reception-appointments`: màn Lịch hẹn của Lễ tân (toàn cửa hàng); dữ liệu mô phỏng nằm trong `mock-data.ts`.
- `features/reception-booking`: màn Đặt lịch thay khách của Lễ tân (tab Lưu trú); dữ liệu mô phỏng nằm trong `mock-data.ts` và `mock-hotel.ts`.
- `features/reception-check-in`: màn Tiếp nhận của Lễ tân (ghi nhận cân nặng thực tế, phản hồi chi phí mới); dữ liệu mô phỏng nằm trong `mock-data.ts` và `mock-api.ts`.
- `features/reception-customers`: màn Khách hàng và Hồ sơ thú cưng của Lễ tân (tìm khách, ghi nhận khách vãng lai, khối lịch hẹn gần đây dạng phiếu rút gọn, tạo/sửa hồ sơ thú cưng); dữ liệu mô phỏng nằm trong `mock-data.ts` và `mock-api.ts`.
- `features/reception-payments`: màn Thanh toán tại quầy của Lễ tân (ghi nhận tiền mặt hoặc chuyển khoản QR); dữ liệu mô phỏng nằm trong `mock-data.ts` và `mock-api.ts`.
- `lib/serving-customer.tsx`: khách đang phục vụ của Lễ tân, giữ trong `sessionStorage`.
- `lib/format.ts`, `lib/time.ts`: định dạng ngày giờ theo múi giờ cửa hàng.

## Đăng nhập và phiên

Tài khoản đăng nhập bằng số điện thoại và mật khẩu qua route handler của chính web này (`/api/session/login`,
`/api/session/refresh`, `/api/session/logout`); các route này gọi backend `/auth/*` ở phía server của Next.js.
Refresh token chỉ nằm trong cookie `ps_rt` (httpOnly, SameSite=Lax, Secure khi chạy https, sống 7 ngày), trình duyệt không đọc được.
Access token chỉ nằm trong bộ nhớ trình duyệt và mất khi tải lại trang; `SessionGate` lấy lại bằng `/api/session/refresh`
rồi gọi `GET /me`. Không lưu token vào `localStorage` hay `sessionStorage`.

- `proxy.ts` chỉ kiểm tra có cookie `ps_rt` hay không: chưa có thì chuyển về `/dang-nhap?next=…`; đã có thì rời `/dang-nhap`.
  Quyền thật luôn do backend kiểm tra.
- Chỉ tài khoản `role = Staff` có `staffRole` hợp lệ được vào. Tài khoản khác đăng nhập đúng vẫn bị từ chối (403) và không được lưu phiên.
- `RoleGate allow={[…]}` bọc các màn chỉ dành cho một vai trò; sai vai trò thì hiện `ForbiddenState` trong khung. `/lich-hen`
  dùng chung hai vai trò nên chưa bọc.
- Đăng xuất hoặc hết phiên tải lại trang `/dang-nhap` để xóa sạch token, bộ đệm Query và khách đang phục vụ.
- Mỗi lần làm mới, backend thu hồi refresh token cũ; hai lời gọi làm mới cùng một token sẽ bị coi là lộ token và thu hồi cả phiên.
  Vì vậy `refreshAccessToken` gộp các lời gọi đồng thời thành một.
- Backend giới hạn đăng nhập/làm mới theo IP; route handler chuyển `X-Forwarded-For` của người dùng để không dùng chung một giới hạn.

Để gọi backend, sao chép `.env.example` thành `.env.local` và điền `NEXT_PUBLIC_API_BASE_URL`
gồm tiền tố `/api/v1`. Biến này công khai trong bundle trình duyệt; không chứa secret.
Nếu thiếu URL, client dừng trước khi gửi request và trả `ApiError` loại `configuration`, không retry.
Development hiển thị tên biến cần cấu hình; production hiển thị câu lỗi chung.
Khung sau đăng nhập gọi `GET /me` khi khôi phục phiên; các màn nghiệp vụ hiện vẫn dùng dữ liệu mô phỏng.

`apiClient` và `setAccessTokenProvider` chỉ dùng trong trình duyệt, sau khi component đã mount hoặc
trong event handler; gọi khi SSR/Server Component/Server Action sẽ bị chặn trước khi đọc token hay gửi request.
Module có ranh giới `use client` và kiểm tra runtime, vì Client Component vẫn có thể được render trên server.
Dùng `useQuery`/`useMutation` trong client component. Chưa dùng `useSuspenseQuery` hay prefetch ở
Server Component với `apiClient` cho tới khi có API client phía server. Chưa cung cấp API client phía server.

Mọi lời gọi backend từ trình duyệt dùng `apiClient`. Lỗi mất mạng và 5xx hiển thị câu chung; 429 hiển thị cảnh báo
thử lại sau; 403 `FORBIDDEN` dùng `ForbiddenState`, khác với 403 `BOOKING_LOCKED` là lỗi nghiệp vụ.
Các lỗi còn lại ưu tiên `detail`, rồi `title`. Query không retry 4xx; mạng/5xx retry tối đa 3 lần;
mutation không tự retry. `setAccessTokenProvider` nhận hàm lấy token trong bộ nhớ; `setSessionHandlers` đăng ký cách làm mới phiên khi API trả 401 (làm mới rồi gửi lại đúng một lần).

Form dùng React Hook Form đã cài, luật validation đặt tại form nghiệp vụ.
Gắn `FieldError` với ô nhập qua `id` và `aria-describedby`, đặt `aria-invalid` khi có lỗi.
Backend hiện trả validation trong `detail`, chưa có lỗi theo trường: hiển thị bằng `ErrorAlert`, giữ dữ liệu đã nhập.
`useToast().showSuccess(message)` tự ẩn sau 3,4 giây; `showError(error)` giữ tới khi người dùng đóng.

Kiểm tra trước khi commit:

```powershell
npm run lint
npm run build
npx tsc --noEmit
npm test
```

Build sinh kiểu Next.js trước khi kiểm tra TypeScript. Để chạy bản production:

```powershell
npm run start -- --port 3001
```

Trong terminal khác, kiểm tra chuyển hướng đăng nhập và khung của server đang chạy:

```powershell
npm run test:smoke
```

`npm test` chạy test infrastructure với HTTP stub tự khởi động và tự dừng trong tiến trình test, cùng test menu theo vai trò của `HeaderNav`, đường dẫn và `proxy` đăng nhập, route handler phiên, làm mới phiên khi API trả 401, form đăng nhập, hàm định dạng, hai màn Lịch sử công việc, Thông báo, màn Lịch hẹn, màn Đặt lịch thay khách, màn Tiếp nhận, các màn Khách hàng và Hồ sơ thú cưng, màn Thanh toán tại quầy của Lễ tân. Lệnh này không cần backend, Next.js server hoặc source ngoài thư mục app.
Loader ESM của Node biên dịch TypeScript/TSX trong bộ nhớ bằng dependency TypeScript đã có, không sinh file build cho test.

`npm run test:smoke` kiểm tra chuyển hướng về `/dang-nhap` khi chưa đăng nhập, khung chờ khi có cookie phiên giả, liên kết
không dẫn tới 404, route handler phiên từ chối yêu cầu không có `Origin`, icon và đường dẫn không tồn tại; cần production server
đang chạy như hướng dẫn trên. Mặc định dùng
`http://127.0.0.1:3001`; đặt biến `SMOKE_BASE_URL` để kiểm tra server ở địa chỉ khác.
Các test này không xác nhận backend thật hay đăng nhập thật (cookie phiên giả chỉ để qua `proxy.ts`).

Build cần truy cập Google Fonts để tải Be Vietnam Pro.
