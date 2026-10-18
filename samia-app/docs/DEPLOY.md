<div dir="rtl">

# الرفع على الإنترنت (Cloudflare Pages)

الموقع شغّال على **https://samia-appointments.pages.dev** ضمن مشروع Cloudflare Pages اسمه `samia-appointments` (مجاني، وبيسمح بالاستعمال التجاري).

النشر بيصير بـ **رفع مباشر من الكمبيوتر** بأداة `wrangler`، والمشروع **مش مربوط بـ GitHub**. يعني الموقع **ما بيتحدث لحاله** لما ينرفع كود جديد: لازم تشغّل أوامر النشر تحت كل مرة. (ليش مش مربوط بـ GitHub؟ انظر آخر الملف.)

---

## قبل ما تبلّش (مرة وحدة)

- قاعدة البيانات مرفوعة: `npx supabase db push` (انظر `SUPABASE_SETUP.md`).
- الخدمات منشورة: `npx supabase functions deploy zoom-meeting` و`npx supabase functions deploy notify-due --no-verify-jwt`.
- حساب Cloudflare مجاني (https://dash.cloudflare.com/sign-up، بدون بطاقة)، ومسجّل دخول بـ wrangler على الجهاز: `npx wrangler login` (بيفتح المتصفح، وافق مرة وحدة).
- ملف `.env` بمجلد `samia-app` فيه القيم الحقيقية، و`VITE_PUBLIC_BASE_URL=https://samia-appointments.pages.dev`. مهم: بالرفع المباشر، البناء بيصير على جهازك، فالقيم اللي بتدخل بالتطبيق هي اللي بملف `.env` المحلي (مش المتغيرات اللي على Cloudflare).
- على Windows بـ PowerShell: إذا طلع خطأ "running scripts is disabled"، اكتب `npx.cmd` بدل `npx`.

---

## نشر تحديث جديد (كل مرة)

افتح Terminal جوا مجلد `samia-app` وشغّل:

```
git pull
npm install
npm run build
npx wrangler pages deploy dist --project-name samia-appointments --branch claude/appointments-app-plan-86k9fn --commit-dirty=true
```

- `npm run build` بيفحص الكود وبيبني مجلد `dist/`.
- السطر الأخير بيرفع `dist/` على المشروع. `--branch` لازم يطابق فرع الإنتاج بالمشروع (`claude/appointments-app-plan-86k9fn`) عشان الرابط الرئيسي يتحدث؛ أي اسم فرع ثاني بيعطي رابط معاينة بس.
- بياخد دقيقة تقريباً. التطبيق المثبّت على التلفون بيتحدث لحاله عند فتحه.

إذا تغيرت قاعدة البيانات (ملفات جديدة بـ `supabase/migrations/`): `npx supabase db push`.
إذا تغيرت خدمة (`supabase/functions/`): أعد نشرها بنفس أوامر "قبل ما تبلّش".

---

## إعدادات المشروع على Cloudflare

موجودة بالمشروع من أول نشر (Settings ← Variables and Secrets). بتلزم بس إذا صار البناء على Cloudflare (ربط Git)، بس خليها هيك:

| الاسم | القيمة |
|---|---|
| `VITE_SUPABASE_URL` | رابط مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام (anon / Publishable) |
| `VITE_PUBLIC_BASE_URL` | `https://samia-appointments.pages.dev` |
| `VITE_VAPID_PUBLIC_KEY` | المفتاح العام للتنبيهات |
| `NODE_VERSION` | `22` |

---

## إعدادات Supabase للرابط

**Supabase ← Authentication ← URL Configuration:**
- **Site URL:** `https://samia-appointments.pages.dev`
- **Redirect URLs:** `https://samia-appointments.pages.dev/**` (عشان رابط "نسيت كلمة السر" يرجّعك للموقع) و`http://localhost:5173/**` للتجربة المحلية.

نفس القيم مكتوبة بملف `supabase/config.toml` (`site_url` و`additional_redirect_urls`). إذا رفعت الإعدادات بأمر `npx supabase config push`، انتبه لهاي النقطة: `[auth] enable_signup = false` بيسكّر التسجيل الجديد (وهاد المطلوب)، بس `[auth.email] enable_signup` لازم يبقى `true`، لأن `false` هون بيطفّي الدخول بالإيميل كلياً وسامية ما بتقدر تفوت ("Email logins are disabled").

**وبالتطبيق:** سجّل دخول ← **الإعدادات ← رابط التطبيق** ← اكبس "استعمل رابط هاي الصفحة" ← احفظ. من هاد الرابط بينبني رابط الرد اللي بيوصل للزبائن.

---

## ثبّتي التطبيق على تلفونك

- **آيفون:** افتحي الرابط بـ Safari ← زر المشاركة ← **إضافة إلى الشاشة الرئيسية**.
- **أندرويد:** افتحي الرابط بـ Chrome ← القائمة ← **تثبيت التطبيق**.

بعدها فعّلي التنبيهات حسب `NOTIFICATIONS_SETUP.md`.

---

## ليش مش مربوط بـ GitHub؟ (التحديث التلقائي)

حسب توثيق Cloudflare، مشروع انعمل بـ **رفع مباشر ما بينفع يتحوّل لمشروع مربوط بـ Git بعدين**. التحديث التلقائي بيحتاج **مشروع جديد** مربوط بـ GitHub، وهاد معناه:

- الرابط بيتغيّر (إلا إذا انحذف المشروع القديم أولاً وانعمل الجديد بنفس الاسم `samia-appointments`)، ولازم تنعاد متغيرات البيئة فوق.
- إذا تغيّر الرابط، لازم يتحدث كمان بـ Supabase (Site URL وRedirect URLs) وبإعدادات التطبيق (رابط التطبيق)، والتطبيق ينعاد تثبيته على التلفون.

إذا قررت تعمل هيك: سجّل دخول GitHub بحساب **MHMADYHYA** (صاحب المستودع) ← Cloudflare: **Workers & Pages ← Create ← Pages ← Connect to Git** ← المستودع `MHMADYHYA/MHMADYHYA`، وعبّي:

| الحقل | القيمة |
|---|---|
| **Production branch** | `claude/appointments-app-plan-86k9fn` |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `samia-app` |

ومتغيرات البيئة الخمسة من الجدول فوق. بعدها كل رفع على هاد الفرع بيبني وينشر لحاله خلال دقيقتين. للاستعمال الحالي، الرفع المباشر كافي.

---

## ملاحظات فنية

- **ما في ملف `_redirects`.** Cloudflare Pages بيرجّع `index.html` لحاله لأي رابط مش موجود (طالما ما في ملف `404.html` بالبناء)، فصفحات التطبيق (`/calendar`، `/a/...`) بتفتح بدونه. قاعدة `/* /index.html 200` بترفضها Cloudflare بخطأ "Infinite loop detected"، فانشالت.
- ملف `public/_headers` بيضيف رؤوس الأمان وبيمنع تخزين `sw.js`.

---

## رابط خاص (اختياري)

إذا بدك رابط مثل `mawaeed.example.com` بدل `.pages.dev`: Cloudflare Pages ← مشروعك ← **Custom domains**. بيحتاج إنك تشتري دومين (مش مجاني)، فهاد اختياري وما بيأثر على عمل التطبيق.

</div>
