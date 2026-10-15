# Noor — موقع التطبيق

صفحة هبوط عربية (RTL) لتطبيق نور للقرآن. HTML/CSS/JS خام + Vite، بلا إطار عمل.

## التطوير المحلي

```bash
cd website
npm install
npm run dev      # http://localhost:5173
```

## البناء

```bash
npm run build    # الناتج في website/dist
```

## النشر على Vercel

الطريقة الأسهل (من GitHub):

1. ارفع المستودع إلى GitHub.
2. على [vercel.com/new](https://vercel.com/new) اختر المستودع.
3. اضبط الإعدادات: **Framework Preset = Other**، **Root Directory = website**، وامر البناء `npm run build` ومخرجات البناء `dist`.
4. اضغط Deploy.

أو عبر CLI:

```bash
npm i -g vercel
cd website
vercel --prod
```

## اللقطات

صور الشاشة في `public/screenshots/` تُلتقط من جهاز حقيقي وتُحدَّث مع كل إصدار:

- `mushaf-light.png` — الواجهة الرئيسية (المصحف، وضع نهاري)
- `mushaf-dark.png` — المصحف، الوضع الليلي
- `prayer.png` — مواقيت الصلاة والتنبيهات
- `names99.png` — أسماء الله الحسنى
- `tools.png` — الأدوات (مسبحة وأذكار)

## روابط ثابتة

- تحميل APK: `https://github.com/alop-hue/noor/releases/latest/download/Noor-Quran-v1.0.0.apk`
- المستودع: `https://github.com/alop-hue/noor`

عند إصدار نسخة جديدة بنفس الاسم، يظل رابط التحميل في الموقع صالحًا تلقائيًا (علامة `latest`).
