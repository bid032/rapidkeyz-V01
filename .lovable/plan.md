# ربط المنتجات بـ Google Sheets للتسليم التلقائي

## الفكرة

كل منتج (زي CapCut) بيرتبط بملف جوجل شيتس واحد. جوّه الملف كذا Tab (شيت)، كل tab اسمه = اسم الخطة/المدة (مثلاً "1 شهر"، "3 شهور"، "سنة"). لما زبون يشتري خطة معينة، النظام يفتح الـ tab المطابق ويسحب أول صف متاح ويعلّم عليه Delivered.

## المرونة في شكل الأعمدة

كل شيت هيبدأ بصف Header يحدد الأعمدة. النظام يقرأ الـ header ويفهم شكل البيانات تلقائياً. الأسماء المدعومة (case-insensitive):

- `key` أو `code` أو `activation_key` — مفتاح تفعيل
- `email` — الإيميل
- `password` — الباسورد
- `username` أو `user` — اسم المستخدم
- `notes` أو `extra` — ملاحظات
- `status` — إجباري (available / delivered)
- `delivered_at`, `order_id` — النظام يكتب فيهم بعد التسليم

يعني نفس النظام يشتغل مع:
- شيت فيه `key | status`
- شيت فيه `email | password | status`
- شيت فيه `email | password | username | status`
- شيت فيه `username | password | status`

## تغييرات قاعدة البيانات

إضافة عمودين على `product_plans`:
- `google_spreadsheet_id` (text) — ID الملف من الرابط
- `google_sheet_tab` (text) — اسم الـ tab داخل الملف

خطة واحدة تحدد الملف + الـ tab بتاعها. لو نفس المنتج له 3 خطط، الـ 3 هيشاوروا على نفس `spreadsheet_id` بس بأسماء tabs مختلفة (الأدمن ممكن يعمل copy-paste من خطة لأخرى).

## سيرفر فنكشن `claim_from_google_sheet`

خطوات التسليم:
1. يقرأ header الـ tab (`{tab}!1:1`) ويحدد أرقام الأعمدة.
2. يقرأ الصفوف (`{tab}!A2:Z`) ويلاقي أول صف status = فاضي أو "available".
3. يبني object فيه {email, password, username, key, notes} حسب اللي موجود.
4. يعمل PUT على خانة status = "delivered" + delivered_at + order_id في نفس الصف.
5. يحفظ نسخة في جدول `delivered_accounts` الموجود عشان الزبون يشوفها بعدين والأدمن يعمل audit.

يستدعى تلقائياً من نفس المكان اللي بيستدعي `claim_inventory_for_item` حالياً (بعد الدفع). لو الخطة معاها `google_spreadsheet_id` → يستخدم جوجل شيتس. لو لأ → يفضل يستخدم نظام `account_inventory` الموجود.

## واجهة الأدمن

في صفحة تعديل الخطط (`admin.inventory` أو صفحة المنتج)، حقلين جديدين لكل خطة:
- Google Spreadsheet ID (مع زر Extract من الرابط)
- Tab Name (اسم الشيت)

زر "Test Connection" يقرأ header الـ tab ويعرض الأعمدة اللي فهمها النظام + عدد الصفوف المتاحة، عشان الأدمن يتأكد قبل ما يشتغل.

## الاتصال بجوجل شيتس

الـ connector `GOOGLE_SHEETS_API_KEY` موجود ومربوط بالفعل. كل الاستدعاءات تعدي على gateway باستخدام حساب الجوجل بتاع الأدمن.

## ملاحظات تقنية

- الأدمن لازم يشير الملف Read/Write مع نفس حساب الجوجل المتصل بـ connector.
- النظام هيتعامل مع الشيت كمخزون بطيء — يقرأ عند الطلب بس، مش على interval.
- لو حصل فشل من جوجل (429/5xx)، نعمل retry واحد، ولو فشل تاني نرجع للـ order status "manual_delivery" عشان الأدمن يتدخل.
- الـ status column لازم تكون موجودة في الشيت، لو مش موجودة النظام هيرفض ويقول للأدمن يضيفها.

## ملفات هيتم تعديلها/إنشاؤها

- migration جديد يضيف `google_spreadsheet_id` و `google_sheet_tab` على `product_plans`.
- `src/lib/google-sheets-inventory.functions.ts` — سيرفر فنكشن `claimFromGoogleSheet` و `testSheetConnection`.
- تعديل المكان اللي بيستدعي التسليم عشان يفرّق بين جوجل شيت و DB inventory.
- تعديل صفحة الأدمن (خطط المنتجات) عشان تضيف الحقول + زر الاختبار.
