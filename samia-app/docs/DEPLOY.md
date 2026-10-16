<div dir="rtl">

# الرفع على الإنترنت (Cloudflare Pages)

Cloudflare Pages مجاني وبيسمح بالاستعمال التجاري، وبيسحب الكود من GitHub مباشرة: كل ما ينرفع كود جديد، الموقع بيتحدث لحاله.

الوقت المتوقع: 20 دقيقة.

---

## قبل ما تبلّشي

- قاعدة البيانات مرفوعة: `npx supabase db push` (انظر `SUPABASE_SETUP.md`).
- الخدمات منشورة: `npx supabase functions deploy zoom-meeting` و`npx supabase functions deploy notify-due --no-verify-jwt`.
- عندك القيم الثلاث من ملف `.env` جاهزة (رابط Supabase، المفتاح العام، ومفتاح VAPID العام).

---

## الخطوة 1: حساب Cloudflare

1. افتحي **https://dash.cloudflare.com/sign-up** وسجّلي (مجاني، بدون بطاقة).
2. أكّدي الإيميل.

---

## الخطوة 2: اربطي GitHub

1. من القائمة: **Workers & Pages** ← **Create** ← تبويب **Pages** ← **Connect to Git**.
2. اختاري **GitHub** ووافقي على الربط. اختاري المستودع اللي فيه مجلد `samia-app`.

---

## الخطوة 3: إعدادات البناء

عبّي هيك بالضبط:

| الحقل | القيمة |
|---|---|
| **Project name** | `samia-appointments` (أو أي اسم، بيصير جزء من الرابط) |
| **Production branch** | الفرع الرئيسي (مثلاً `main`) |
| **Framework preset** | `Vite` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | `samia-app` |

ثم افتحي **Environment variables** وأضيفي (لـ Production):

| الاسم | القيمة |
|---|---|
| `VITE_SUPABASE_URL` | رابط مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | المفتاح العام |
| `VITE_PUBLIC_BASE_URL` | رابط الموقع، مثلاً `https://samia-appointments.pages.dev` (بتعرفيه بعد أول نشر، فأضيفيه بعدين وأعيدي النشر) |
| `VITE_VAPID_PUBLIC_KEY` | المفتاح العام للتنبيهات |
| `NODE_VERSION` | `22` |

اكبسي **Save and Deploy**. أول بناء بياخد دقيقتين تقريباً.

---

## الخطوة 4: بعد أول نشر

1. انسخي رابط الموقع (مثل `https://samia-appointments.pages.dev`).
2. **Cloudflare:** ارجعي لـ Settings ← Environment variables وحطي `VITE_PUBLIC_BASE_URL` = الرابط، ثم **Deployments ← Retry deployment** (أو ارفعي أي تغيير على GitHub).
3. **Supabase:** Authentication ← **URL Configuration**:
   - **Site URL:** الرابط نفسه.
   - **Redirect URLs:** أضيفي `https://samia-appointments.pages.dev/**` (عشان رابط "نسيت كلمة السر" يرجّعك للموقع).
4. **التطبيق:** سجّلي دخول ← **الإعدادات ← رابط التطبيق** ← اكبسي "استعمل رابط هاي الصفحة" ← احفظي. هاد الرابط بينبني منه رابط الرد اللي بيوصل للزبائن.

---

## الخطوة 5: ثبّتي التطبيق على تلفونك

- **آيفون:** افتحي الرابط بـ Safari ← زر المشاركة ← **إضافة إلى الشاشة الرئيسية**.
- **أندرويد:** افتحي الرابط بـ Chrome ← القائمة ← **تثبيت التطبيق**.

بعدها فعّلي التنبيهات حسب `NOTIFICATIONS_SETUP.md`.

---

## التحديثات

كل ما ينرفع كود جديد على الفرع الرئيسي بـ GitHub، Cloudflare بيبني وينشر لحاله خلال دقيقتين. التطبيق المثبّت على التلفون بيتحدث لحاله عند فتحه.

إذا تغيرت قاعدة البيانات (ملفات جديدة بـ `supabase/migrations/`)، لازم كمان: `npx supabase db push`.

---

## رابط خاص (اختياري)

إذا بدك رابط مثل `mawaeed.example.com` بدل `.pages.dev`: Cloudflare Pages ← مشروعك ← **Custom domains**. بيحتاج إنك تشتري دومين (مش مجاني)، فهاد اختياري وما بيأثر على عمل التطبيق.

</div>
