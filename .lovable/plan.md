## الفكرة

- كل طلب جديد يدخل بحالة `pending` بغض النظر عن بوابة الدفع أو نوع التسليم.
- كل عنصر (order_item) يبقى له حالة مستقلة: `pending` / `delivered` / `refunded`.
- الأدمن من صفحة الطلبات يعمل "تسليم" لكل عنصر:
  - لو العنصر تسليمه فوري وله مخزون → يضغط "تسليم فوري" فيسحب من المخزون ويسلم للعميل تلقائيًا مع إيميل بيانات الحساب.
  - لو يدوي → يضغط "تسليم يدوي" ويدخل بيانات الحساب (نفس الفلو الحالي في مخزون التسليم/التسليم اليدوي).
- عند تحول كل العناصر إلى `delivered` → حالة الطلب الرئيسية تتحول تلقائيًا إلى `delivered` (تريجر في قاعدة البيانات).
- العميل في `/dashboard` لا يشوف بيانات الحساب إلا للعناصر اللي حالتها `delivered` فقط.

## التغييرات

### 1) قاعدة البيانات (migration)
- إنشاء enum `order_item_status` بقيم: `pending`, `delivered`, `refunded`.
- إضافة عمود `order_items.status` افتراضي `pending`.
- تعيين كل الصفوف الحالية اللي عندها `delivered_accounts` كـ `delivered`، والباقي `pending`.
- تريجر `AFTER UPDATE OF status ON order_items`: لو كل العناصر في نفس الطلب أصبحت `delivered` → حدّث `orders.status = 'delivered'`.
- بدون تغيير enum الطلب الرئيسي.

### 2) `src/routes/checkout.tsx`
- إزالة الـ auto-claim للمخزون عند الشراء.
- إزالة تحديث حالة الطلب لـ `delivered` وإزالة `notifyCustomerDelivery`.
- كل طلب يُنشأ بحالة `pending` (حتى لو `simulate`) مع إبقاء بوابة الدفع كما هي.
- بوب-أب النجاح يعرض "تم إرسال الطلب بنجاح وقيد المراجعة".

### 3) `src/routes/_authenticated/admin.orders.tsx`
- لكل عنصر في تفاصيل الطلب: عرض شارة الحالة (`pending`/`delivered`/`refunded`) + أزرار:
  - "تسليم فوري من المخزون" (لو delivery_type=instant وفيه plan_id ومخزون متاح) → استدعاء `claim_inventory_for_item` ثم `notifyItemDelivered` ثم تحديث `status=delivered`.
  - "تسليم يدوي" (يفتح مودال إدخال بيانات الحساب) → يعمل insert في `delivered_accounts` ثم `notifyItemDelivered` ثم `status=delivered`.
  - "استرداد العنصر" (لاحقًا، نفس زر الاسترداد الحالي).
- الطلب الكلي لا يعود يتغير يدويًا لـ delivered، التريجر يتكفل بذلك تلقائيًا.

### 4) `src/routes/_authenticated/dashboard.tsx`
- في تفاصيل طلب العميل: تظهر بيانات الحساب فقط للعناصر اللي `status = 'delivered'`. الباقي يظهر "قيد المراجعة/التسليم".

### 5) `src/lib/notify-order.functions.ts`
- `notifyItemDelivered` موجود ويعمل، لا يحتاج تعديل جوهري.

## ملاحظات
- تسلسل UI البسيط للأدمن: لو الأدمن ضغط "تسليم فوري" ولم يوجد مخزون، تظهر رسالة "لا يوجد مخزون متاح - سلّم يدويًا".
- الإجمالي/إعادة الحساب وسياسات الـ RLS لا تتأثر.