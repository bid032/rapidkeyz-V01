
## نظام أكواد الخصم (Coupons)

### 1. قاعدة البيانات
جدول `coupons` جديد بالحقول:
- `code` (نص فريد، uppercase)
- `discount_type` (`percent` أو `fixed`)
- `discount_value` (رقم)
- `max_uses` (رقم، nullable = لا نهائي)
- `used_count` (رقم، افتراضي 0)
- `expires_at` (تاريخ، nullable)
- `is_active` (بوليان)
- `applies_to` (`all` أو `specific`)
- `product_ids` (uuid[])
- `min_order_amount` (nullable)

جدول `coupon_redemptions` لتسجيل الاستخدامات (coupon_id, order_id, user_id, amount_discounted).

**RLS:**
- قراءة/تعديل: admin + moderator
- استعلام التحقق (RPC `validate_coupon`) متاح للجميع (guests included)
- تريجرات audit_log للإنشاء/التعديل/الحذف/الاستخدام

**RPC:** 
- `validate_coupon(code, order_items[])` — يرجع الخصم المحسوب أو خطأ
- `redeem_coupon(coupon_id, order_id)` — يزيد used_count ذرياً بعد نجاح الطلب

### 2. صفحة الإدارة `/admin/coupons`
- صلاحية: admin + moderator
- جدول بكل الأكواد + حالة (نشط/منتهي/مستنفد) + بحث بالكود
- زرار "إضافة كوبون" → مودال يحوي:
  - الكود (auto-uppercase)
  - نوع الخصم (نسبة/مبلغ ثابت) + القيمة
  - عدد الاستخدامات (فارغ = لا نهائي)
  - تاريخ الانتهاء (اختياري)
  - يطبق على: كل الخدمات / خدمة معينة (multi-select مع بحث)
  - حد أدنى للطلب (اختياري)
  - تفعيل/إيقاف
- تعديل/حذف مع تأكيد
- عرض عدد مرات الاستخدام والمستخدمين

### 3. تكامل في الـ Checkout
- حقل "كود خصم" في `checkout.tsx`
- زر "تطبيق" ينادي `validate_coupon` ويعرض:
  - قيمة الخصم مطبقة على الـ subtotal
  - الإجمالي الجديد
- عند التأكيد: تخزين `coupon_id` + `discount_amount` في `orders`
- إضافة عمودين للجدول `orders`: `coupon_id`, `discount_amount`
- استدعاء `redeem_coupon` بعد إنشاء الطلب

### 4. عرض في تفاصيل الطلب
- في `admin.orders.tsx`: عرض الكوبون المستخدم وقيمة الخصم
- في `dashboard.tsx` (تفاصيل العميل): عرض قيمة الخصم
- في إيميلات الطلب

### 5. سجل العمليات
تريجرات audit لجدولي `coupons` و `coupon_redemptions`.

### الملفات الجديدة/المعدّلة
- migration: `coupons`, `coupon_redemptions`, RPCs, triggers, alter `orders`
- جديد: `src/routes/_authenticated/admin.coupons.tsx`
- جديد: `src/lib/coupons.ts` (helpers للفاليدشن الأمامي)
- تعديل: `src/routes/checkout.tsx` (حقل الكود + منطق التطبيق)
- تعديل: `src/routes/_authenticated/admin.tsx` (إضافة رابط التابة)
- تعديل: `src/routes/_authenticated/dashboard.tsx` (عرض الخصم)
- تعديل: `src/routes/_authenticated/admin.orders.tsx` (عرض الكوبون)
- تعديل: `src/lib/email-templates/new-order.tsx` + `order-delivered.tsx` (سطر الخصم)

هل أبدأ التنفيذ؟
