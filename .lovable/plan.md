# خطة إعادة الهيكلة والتحسين — RapidKeyz

هذه الخطة نتيجة تحليل شامل للمشروع (Frontend + Backend + DB + RLS + Storage).
مرتبة بالأولوية: 🔴 Critical → 🟠 High → 🟡 Medium → 🟢 Low.

## ✅ تم إصلاحه في هذه الجلسة

- [x] **Hydration Mismatch** في `__root.tsx` — عنصر السبلاش كان يُرسم على السيرفر ويُحذف بواسطة سكريبت قبل React hydration. الحل: رندر عنصر فاضي `<div id="rk-pre-splash" suppressHydrationWarning />` والسكريبت يملأه بعد الـ parse ثم يخفيه بـ `display:none` بدل الحذف.
- [x] **REVOKE EXECUTE** على دوال الـ triggers الداخلية (`handle_new_user`, `update_updated_at_column`, `decrement_plan_stock_on_order_item`, `grant_default_admin_on_confirm`).
- [x] **`payment-proofs` bucket**: قيد الرفع على مسار `<uid>/…` أو `guest/…` + حد 5MB + mime محدد. تعديل `checkout.tsx` لاستخدام المسار الجديد.
- [x] **notify-order functions**: إضافة recency guard (30 دقيقة) لمنع سبام الإيميلات لو UUID اتسرب. إيميل الأدمن اتنقل لـ `site_settings.admin_notify_email` (+ env fallback).
- [x] **Sonner toasts** بقت في منتصف الشاشة المعروضة (offset 45dvh + top-center).
- [x] **Dialog close button** انتقل لجهة `end-3` (يسار في RTL) عشان مايتصادمش مع الأيقونة.

---

## 🔴 Critical (أمان + استقرار)

### C1. حماية Endpoints المفتوحة بتوقيع رقمي
`notifyNewOrder` و `notifyCustomerDelivery` و `markInventorySoldOnSheet` كلها Public Server Functions. حاليًا محمية بـ recency + idempotency، بس الحل الأنظف:
- إنشاء **HMAC secret** (`NOTIFY_HMAC_SECRET`) في env.
- عند إنشاء الطلب، ولد `order_notify_token = hmac(secret, orderId)` وابعته للـ client مع الـ order response.
- الـ server function تتحقق من التوقيع قبل ما تنفذ.
- **بديل أفضل**: نقل الإشعارات لـ **Database Trigger + pg_net** يستدعي `/api/public/webhooks/order-created` بتوقيع مشترك.

### C2. تسريب PII في Excel exports
تصدير `admin.orders.tsx` و`admin.index.tsx` بيحمل ايميلات وأرقام واتساب. تأكد من:
- الفلاتر الافتراضية بتحد التاريخ (مش بتصدر كل الطلبات).
- إضافة audit log (من صدّر، إمتى، كام سطر).

### C3. Google Sheets Sync — auth caller identity
`markInventorySoldOnSheet` unauthenticated. يفضّل:
- يتنقل لنفس trigger pattern (pg_net → server route بتوقيع).
- أو يبقى داخل createServerFn محمي بـ `requireSupabaseAuth` ويتستدعى من الأدمن بس بعد التسليم اليدوي.

---

## 🟠 High (Performance + UX)

### H1. Code Splitting للـ 3D / Animation
- `three` + `gsap` + `HeroCanvas` + `FloatingLogos` + `Logo3D` بيتحملوا في الـ initial bundle. المطلوب:
  - `React.lazy(() => import(...))` مع `<ClientOnly>` لكل واحد فيهم.
  - تحميل GSAP plugins (`SplitText`, `ScrollTrigger`) عند الحاجة فقط.
- تأثير متوقع: ↓ initial JS 200-400 KB.

### H2. تقليل الـ Realtime/subscriptions المكررة
- `AppContext` + `useAdminRole` + `admin.tsx` كلهم بيستدعوا `supabase.auth.getUser()` أو `getSession()`. توحيدهم في hook واحد `useSession()` مع React Query cache.

### H3. Query Deduplication
- كتير من الـ pages بيعملوا `useQuery` بنفس queryKey مع `queryFn` مختلف بسيط (مثل `products` فلترة). توحيدهم بـ selector من نفس query أفضل.

### H4. Image Optimization
- صور الـ product-images بتتحمل بحجمها الأصلي. إضافة Cloudflare Image Resizing أو Supabase image transform:
  `supabase.storage.from(...).getPublicUrl(path, { transform: { width: 400, quality: 80 } })`

---

## 🟡 Medium (تنظيم الكود + صيانة)

### M1. توحيد أنماط الأخطاء
- بعض الـ mutations بترمي Error خام، بعضها بترجع `{ok:false, reason}`. توحيد على نمط واحد + toast helper موحّد.

### M2. Refactor `admin.index.tsx`
- الملف كبير (chart + summary chips + tables). فصله لـ:
  - `AdminOverviewChart.tsx`
  - `AdminSummaryCards.tsx`
  - `AdminRecentOrders.tsx`

### M3. i18n keys
- كتير من النصوص العربية hardcoded في الـ components. نقلها كلها لـ `src/lib/i18n.ts` عشان لو حبيت تدعم لغة تانية يبقى سهل.

### M4. Types للـ Supabase
- `as any` مستخدم في كذا مكان (`notify-order.functions.ts`, `admin.products.tsx`). استخدام `Database['public']['Tables'][...]['Row']` بدلها.

### M5. Test coverage
- إضافة Vitest tests للـ:
  - `has_role` RPC integration
  - Cart total calculation
  - Recency guard في notify functions

---

## 🟢 Low (تلميع)

- L1: إزالة `BrandMarquee.tsx` (اتشال من الـ UI بس الملف موجود).
- L2: توحيد أسماء الملفات (بعضها kebab-case، بعضها PascalCase).
- L3: إضافة `robots.txt` + `sitemap.xml` من generator.
- L4: OG images ديناميك للـ product pages (server function ترجع صورة).

---

## طريقة التنفيذ المقترحة

- **Sprint 1 (يوم واحد)**: C1 + C2 + H1
- **Sprint 2 (يوم)**: H2 + H3 + H4
- **Sprint 3 (يوم)**: M1 + M2 + M4
- **Sprint 4 (نصف يوم)**: M3 + M5 + Low

قوللي أبدأ منين وأنا هنفّذ.
