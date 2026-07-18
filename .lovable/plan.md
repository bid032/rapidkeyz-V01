# خطة التنفيذ

قائمة كبيرة (25+ تعديل). هنقسمها لمراحل عشان الجودة والتحكم. لو موافق، هبدأ فورًا بالمرحلة 1 وننزل لبقيتهم بالترتيب.

---

## المرحلة 1 — الهيرو + الهيدر + التسجيل

**1. لوجو 3D في الهيرو (شمال)**
- إضافة موديل Three.js: لوجو R يتحرك بالماوس (rotation follow) مع lighting وbrand glow.
- يستبدل الفراغ الحالي على الديسكتوب فقط.

**2. كروت TRENDING/NEW clickable**
- تعرض الاسم الحقيقي + السعر من DB (query لأول trending/new product).
- Link لصفحة المنتج + إضافة لوجو المنتج.

**3. "المتجر" → "الأقسام" في الهيدر**
- تعديل نص الرابط في `Header.tsx` (AR/EN).

**التسجيل — حقول إضافية**
- إضافة: اسم + رقم واتساب + دولة (dropdown) في `auth.tsx` signup mode.
- تخزينهم في `profiles` (migration: إضافة أعمدة `phone`, `country` لو مش موجودين).
- Validation بـ zod.

---

## المرحلة 2 — عرض الأقسام + المنتجات

**5. تصغير قسم "تسوق حسب القسم"**
- حذف كلمة "تسوق حسب" — العنوان يبقى "الأقسام".
- الأربع أقسام جنب بعض في صف واحد مضغوط (grid-cols-4، أيقونات صغيرة).

**8. تنظيف الأقسام**
- إبقاء قسمين فقط: AI + أدوات المصممين. حذف الباقي من العرض على الهوم.

---

## المرحلة 3 — كارت المنتج + السلة

**11. زرار "أضف للسلة" + صوت + انيميشن**
- إضافة sound effect (tick قصير — Web Audio API generated بدون ملف خارجي).
- Fly-to-cart animation: نسخة مصغرة من الكارت تطير للأيقونة في الهيدر (GSAP).
- Bump animation على cart badge.

---

## المرحلة 4 — لوحة التحكم (Admin + User)

**25. تحكم الأدمن في محتوى FAQ**
- Migration: جدول `faqs` (id, question_ar, question_en, answer_ar, answer_en, order, is_active).
- صفحة `admin.faqs.tsx` — CRUD.
- `FAQ.tsx` يقرأ من DB.
- GRANT: SELECT للجميع (anon+authenticated), ALL للـ service_role + admin write policies.

**تابة "تعويضات" في الداشبورد**
- Migration: جدول `refunds` (id, user_id, order_id?, amount, type: 'full'|'partial'|'replacement', notes, created_at, created_by).
- تظهر للعميل في داشبورده (read-only) — تابة جديدة.
- في الأدمن: صفحة `admin.refunds.tsx` — إضافة/تعديل تعويض لأي عميل.
- يتخصم من إجمالي الأرباح في `admin_revenue_stats` (تعديل الـ RPC).
- RLS: العميل يشوف بتاعه فقط, الأدمن يشوف الكل.

---

## ملاحظات تقنية

- كل الـ migrations تشمل GRANT + RLS policies.
- Three.js logo: هنستخدم geometry بسيط (extruded R shape) لأن تحميل GLTF ثقيل.
- الصوت: WebAudio oscillator (tick) — بدون assets.
- كل التغييرات backward-compatible: الأعمدة الجديدة في profiles nullable.

---

## اللي مش هيتنفذ (حسب طلبك)
- ❌ #13 من الـ PDF

---

## الأولوية المقترحة
1 → 3 → 5 → 8 → 11 → 25 → التسجيل الموسع → التعويضات.

لو موافق أبدأ، هبدأ بالمرحلة 1 كاملة. لو عايز ترتيب مختلف أو تركيز على مرحلة واحدة الأول قوللي.