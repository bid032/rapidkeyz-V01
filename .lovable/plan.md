# خطة تحسين SEO لموقع RapidKeyz

هدف الخطة: رفع ظهور الموقع في نتائج جوجل للكلمات المفتاحية العربية المتعلقة باشتراكات ChatGPT وMidjourney وNetflix وأدوات الذكاء الاصطناعي، وتحسين تجربة الزحف والفهرسة والمشاركة على السوشيال.

## 1) البنية التحتية للفهرسة (Crawling & Indexing)
- إنشاء `src/routes/sitemap[.]xml.ts` يولّد Sitemap ديناميكي يشمل: الصفحة الرئيسية، `/shop`، `/about`، `/terms`، `/privacy`، وكل صفحات المنتجات `/product/$slug` مأخوذة من قاعدة البيانات (فقط المنتجات `status = active`).
- إنشاء/تحديث `public/robots.txt` للسماح بالزحف مع منع مسارات الأدمن والمصادقة، وإضافة رابط الـSitemap بعد نشر الدومين.
- إضافة Canonical URL لكل صفحة (نسبي حالياً حتى يُثبَّت الدومين).
- ربط Google Search Console والتحقق عبر meta tag بعد النشر.

## 2) ميتاداتا لكل صفحة (Head Metadata)
- كل route يحصل على `title` و`description` و`og:title` و`og:description` و`og:type` و`og:url` فريدة.
- الصفحات المستهدفة:
  - `/` — الصفحة الرئيسية (Keyword: اشتراكات ذكاء اصطناعي، شحن ChatGPT Plus مصر).
  - `/shop` — المتجر (Keyword: متجر اشتراكات رقمية).
  - `/product/$slug` — ديناميكي من بيانات المنتج (اسم + وصف + سعر + صورة).
  - `/about`, `/terms`, `/privacy`, `/auth`, `/cart`, `/checkout` (الأخيرة `noindex`).
- استخدام `og:image` من `icon_url` للمنتج على leaf routes فقط.

## 3) البيانات المنظمة (JSON-LD Structured Data)
- `__root.tsx`: Organization + WebSite (مع SearchAction).
- `/product/$slug`: Product schema (name, description, image, offers.price, priceCurrency=EGP, availability, aggregateRating من التقييمات إن وجدت).
- `/shop`: BreadcrumbList + ItemList.
- الصفحة الرئيسية: FAQPage للأسئلة الشائعة إن أُضيفت.

## 4) المحتوى والكلمات المفتاحية
- كتابة أوصاف عربية غنية (150-160 حرفاً) لكل منتج ولكل صفحة.
- إضافة H1 واحد واضح لكل صفحة (حالياً الرئيسية بها H1 لكن باقي الصفحات تحتاج مراجعة).
- استخدام هيكل عناوين هرمي H1 → H2 → H3.
- إضافة قسم FAQ في الصفحة الرئيسية أو صفحة المنتج.

## 5) الأداء (Core Web Vitals)
- إضافة `loading="lazy"` و`width/height` لكل الصور.
- تحويل الصور إلى WebP/AVIF عند الإمكان.
- تقليل حجم الـfonts (تحميل أوزان `IBM Plex Sans Arabic` المستخدمة فعلاً فقط: 400/500/700 مثلاً بدلاً من 5 أوزان).
- استخدام `font-display: swap` (موجود بالفعل عبر Google Fonts).

## 6) إمكانية الوصول والـSemantic HTML
- استخدام عناصر `<main>`, `<nav>`, `<article>`, `<section>` بشكل صحيح.
- `alt` نصي وصفي لكل الصور (خاصة أيقونات المنتجات).
- `aria-label` للأزرار الأيقونية (WhatsApp Float, إلخ).
- `lang="ar"` و`dir="rtl"` موجودان على `<html>` — جيد.

## 7) SEO المحلي والدولي
- إضافة `hreflang` لو أُضيفت نسخة إنجليزية منفصلة (حالياً i18n داخل نفس الصفحة، لذا يكفي `lang="ar"`).
- إضافة `geo.region` meta tag لمصر إن كان الاستهداف مصرياً.

## 8) Social & Sharing
- توليد صورة `og:image` احترافية للصفحة الرئيسية (1200×630) وحفظها في `public/`.
- التأكد من `twitter:card` = `summary_large_image` مع `twitter:image`.

## 9) الروابط الداخلية
- ربط المنتجات المرتبطة في `/product/$slug`.
- إضافة breadcrumbs مرئية في صفحات المنتج والمتجر.
- روابط داخلية من الـFooter لأهم الفئات.

## 10) تشغيل فحص SEO
- بعد التطبيق: تشغيل SEO scan داخلي وإصلاح ما يظهر من findings.

---

## Technical Implementation Order
1. Sitemap ديناميكي + robots.txt.
2. Head metadata لكل route + canonical + og:url.
3. JSON-LD (Organization, WebSite, Product, BreadcrumbList).
4. Alt texts + aria-labels + lazy loading.
5. Breadcrumbs مرئية.
6. FAQ section + Related products.
7. og:image افتراضي.
8. تشغيل SEO scan نهائي.

هل توافق على تنفيذ الخطة كاملة أم تفضل البدء بمرحلة معينة أولاً؟
