# خطة التنفيذ

## 1) ريسبونسيف الفون في كل الموقع

### الهيدر (مشكلة كبيرة)
- الهيدر حالياً مفيهوش قائمة موبايل خالص — لينكات (الرئيسية / المتجر / من نحن) مخفية على الفون.
- هضيف زرار Hamburger + Drawer/Sheet فيه كل اللينكات + زرار تسجيل الدخول.

### الصفحات العامة
- `index.tsx` (Home) — تظبيط `px-6/py-24` → `px-3 sm:px-6 py-12 sm:py-24`، تدرج أحجام العناوين `text-3xl sm:text-5xl md:text-7xl`.
- `about.tsx`, `privacy.tsx`, `terms.tsx`, `auth.tsx`, `cart.tsx`, `checkout.tsx`, `product.$slug.tsx`, `shop.tsx` — نفس المعالجة (padding + typography scale).
- `Footer.tsx` — `px-3 sm:px-6`.

### الداشبورد (Admin)
- `admin.index.tsx` — الهيدر `flex flex-wrap` → `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `truncate`.
- `admin.orders.tsx` — تغليف الجدول في `overflow-x-auto` مع `min-w-[720px]`، تظبيط الفلاتر تتكدس عمودياً.
- `admin.products.tsx`, `admin.inventory.tsx`, `admin.categories.tsx`, `admin.testimonials.tsx` — نفس المعالجة (جداول قابلة للسحب أفقياً، فورمز تتكدس على الموبايل، Dialog padding مضغوط).
- `dashboard.tsx` (يوزر) — نفس المعالجة.
- سايدبار الأدمن — بدل الصف الأفقي القابل للسكرول، هعمله Sheet جانبي على الموبايل مع زرار قائمة، ويرجع سايدبار عادي من `md:` فوق.

## 2) أنيميشن الهوم بيدج

استخدام `framer-motion` (متركب بالفعل) لعمل reveals متتالية:
- **الهيرو**: البادج، السطر الأول من العنوان، السطر التاني، الوصف، أزرار CTA، صف "موثوق من..." — كلهم fade + slide-up بترتيب متتالي (stagger 0.1s).
- **صف الأقسام (Pills)** — stagger fade-in.
- **عنوان "الأكثر رواجاً"** — fade-in-up مع scroll (`whileInView`).
- **كروت المنتجات** — stagger fade + zoom خفيف عند الظهور في الشاشة.
- **سكشن التقييمات** — fade-in عند الـ scroll.
- Hover على الكروت — scale خفيف (1.02) + shadow.

## 3) الهيرو في الإعدادات — إظهار القيم الحالية

المشكلة: خانات الهيرو في `admin.settings.tsx` بتظهر فاضية والـ placeholder بس بيقول اسم الحقل، فالأدمن مش عارف الظاهر حالياً على الموقع إيه.

الحل:
- تعديل الـ state initial values في `admin.settings.tsx` بحيث لو الـ DB مفيهوش قيمة، يتم استخدام النص الافتراضي من `i18n.ts` (نفس النص الظاهر للزائر).
- إظهار قيمة السطر الحالي في `site_settings.hero` لو موجودة، وإلا الفولباك من `t.home.*`.
- تحت كل input هيبقى فيه سطر صغير رمادي بيقول: "الظاهر حالياً على الموقع: {النص}" علشان الأدمن يبقى فاهم بيعدل إيه.

## 4) دور مودريتور (Moderator) جديد

### تغييرات قاعدة البيانات (Migration)
- إضافة قيمة `moderator` لـ enum `app_role`.
- سياسات RLS الحالية بتفحص `has_role(admin)` فقط، فالمودريتور تلقائياً مش هيقدر يعدل جداول محمية بالأدمن (orders, user_roles, ..) — ده تأمين على مستوى الداتابيز.

### تغييرات الكود
- `admin.tsx` (الـ layout gate): بدل ما يفحص `admin` بس، يسمح للـ `admin` والـ `moderator` بالدخول، ويحفظ الدور في `Route context`.
- فلترة السايدبار حسب الدور:
  - **مودريتور مش هيشوف**: نظرة عامة (Overview / `/admin`)، الأوردرات، اليوزرز.
  - **مودريتور هيشوف**: Products, Categories, Inventory, Testimonials, Settings.
- إعادة توجيه صفحة `/admin` (Overview) الافتراضية للمودريتور تروح `/admin/products`.
- إضافة `beforeLoad` guard على `admin.index.tsx`, `admin.orders.tsx`, `admin.users.tsx` يطرد المودريتور لو حاول يفتحهم مباشرة من الـ URL.
- في `admin.users.tsx` (مع إن المودريتور أصلاً مش هيوصلها) — حماية إضافية من الـ RLS بتمنع أي تعديل غير الأدمن.

## تفاصيل تقنية
- الأنيميشن: `motion.div` + `initial={{ opacity: 0, y: 20 }}` + `whileInView={{ opacity: 1, y: 0 }}` + `viewport={{ once: true }}` + `transition={{ delay, duration }}`.
- الـ Sheet الجانبي في الأدمن: استخدام `@/components/ui/sheet` (shadcn) الموجود.
- Migration الـ enum:
  ```sql
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
  ```
- الـ role check في الـ layout: query واحد يجيب كل الأدوار للـ user ويرجعهم في context.

## الترتيب
1. Migration الـ role الجديد (أول حاجة علشان الباقي يبني عليها).
2. تعديل `admin.tsx` gate وإضافة role context + فلترة السايدبار + Sheet للموبايل.
3. Guards على صفحات الأدمن المحظورة.
4. تعديل `admin.settings.tsx` (الهيرو prefill).
5. الأنيميشن في `index.tsx`.
6. باس الريسبونسيف على كل الصفحات العامة والأدمن.
