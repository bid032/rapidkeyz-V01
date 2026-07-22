# دليل الترحيل لـ Supabase الجديد

## قبل ما نبدأ

انت عندك دلوقتي 3 ملفات جاهزة في فولدر `migration`:

| الملف | الاستخدام |
|-------|-----------|
| `01_schema.sql` | بيعمل كل الجداول والدوال والصلاحيات في Supabase الجديد |
| `02_data.sql` | بينقل البيانات اللي موجودة دلوقتي (منتجات، طلبات، إلخ) |
| `03_post_schema.sql` | بيعمل Storage Buckets و Realtime و التريجرز النهائية |

## الخطوات بالتفصيل (اعملها بالترتيب)

### الخطوة 1: افتح Supabase project الجديد

1. ادخل على: https://supabase.com/dashboard
2. افتح المشروع الجديد اللي عملته.

### الخطوة 2: جيب 3 حاجات من المشروع الجديد

من الشمال اضغط على **Project Settings** (آيقونة الترس)، بعدين من القائمة اختار **API**.

هتلاقي 3 حاجات محتاجينها:

1. **Project URL** — هيبقى شكله كده: `https://xxxxxxxx.supabase.co`
2. **Project API keys → anon public** — هيبقى شكله: `sb_publishable_...`
3. **Project API keys → service_role secret** — هيبقى شكله: `sb_secret_...`

انسخهم و احتفظ بيهم في ملف Notepad مؤقتاً.

> ⚠️ ماتشاركش الـ `service_role secret` مع حد. ده مفتاح الأدمن.

### الخطوة 3: شغّل ملف الـ Schema

1. من الشمال اضغط على **SQL Editor**.
2. اضغط **New query**.
3. افتح ملف `01_schema.sql` من فولدر `migration` (افتحه بـ Notepad أو أي محرر).
4. انسخ كل محتواه والصقه في SQL Editor.
5. اضغط **Run**.

لو ظهرت أي رسالة خضراء أو صفحة فاضية، يبقى كله تمام.

### الخطوة 4: شغّل ملف البيانات

نفس الخطوات السابقة بس للملف `02_data.sql`.

1. New query جديدة.
2. انسخ محتوى `02_data.sql` والصقه.
3. اضغط **Run**.

### الخطوة 5: شغّل ملف الإعدادات النهائية

نفس الكلام للملف `03_post_schema.sql`.

### الخطوة 6: اعمل Storage Buckets

1. من الشمال اضغط **Storage**.
2. هتلاقي البوكتس اتعملت من الخطوة 5.
3. لو مش موجودة، اعملها يدوياً بالأسماء دي:
   - `product-images` (Public)
   - `testimonial-images` (Public)
   - `payment-proofs` (Private)

### الخطوة 7: نقل صور المنتجات (لو عايز تحافظ عليها)

الصور الموجودة في Lovable Cloud لازم تنقلها يدوياً:

1. من Lovable Cloud / Supabase الحالي: Storage → product-images → Download للصور.
2. في Supabase الجديد: Storage → product-images → Upload الصور بنفس الأسماء.

### الخطوة 8: حدّث بيانات الموقع

افتح ملف `.env` في المشروع (أو اعمله لو مش موجود) وحط القيم الجديدة:

```env
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
VITE_SUPABASE_PROJECT_ID=xxxxxxxx

SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxx
SUPABASE_PROJECT_ID=xxxxxxxx
```

استبدل `xxxxxxxx` بالقيم اللي جبتها من الخطوة 2.

### الخطوة 9: اختبر الموقع

1. شغّل الموقع محلياً: `bun dev` (أو `npm run dev`).
2. جرب تفتح الصفحة الرئيسية وتشوف المنتجات ظاهرة ولا لأ.
3. جرب تسجيل دخول بحساب جديد.

---

## لو حصل مشكلة

### المشكلة: "relation already exists" أو "policy already exists"

ده معناه إنك شغّلت الملف أكتر من مرة. مش مشكلة، بس تأكد إن البيانات اتنقلت صح.

### المشكلة: الصور مش ظاهرة

لازم تنقل الصور يدوياً من الـ Storage القديم للجديد (الخطوة 7).

### المشكلة: الإيميلات مش بتوصل

في Supabase الجديد: Authentication → Providers → Email → شغّل **Confirm email** و **Secure email change** حسب اللي تحبيه.

---

## ملاحظة مهمة

الموقع الحالي مبني على **TanStack Start** وده محتاج Node.js server. الاستضافة اللي قولت عليها (`etohost.com`) غالباً بتدعم PHP بس. لازم تتأكد إنها تدعم:

- Node.js
- Vite build
- Static files + SSR

لو مش متأكد، اسأل دعم etohost قبل ما ترفع.
