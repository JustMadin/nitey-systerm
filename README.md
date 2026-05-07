# 🌙 Nitey Discord Bot

بوت ديسكورد متكامل يقرأ إعداداته من داشبورد Nitey (Lovable Cloud).

---

## 🚀 نشر على Railway (مجاني — أسهل طريقة)

### الخطوات (5 دقائق):

1. **سجّل في Railway**: https://railway.app → Login with GitHub
2. **ارفع مجلد `bot/` على GitHub** (repo جديد فاضي → ارفع الملفات)
3. **في Railway**: New Project → Deploy from GitHub repo → اختر الريبو
4. **أضف المتغيرات** (Variables tab):
   ```
   DISCORD_BOT_TOKEN        = توكن البوت من Discord Developer Portal
   DISCORD_CLIENT_ID        = Application ID
   SUPABASE_URL             = https://aasljdvkbhlfwgaaryet.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = من Lovable Cloud → Settings → API
   ```
5. **Deploy** — Railway راح يشغّل البوت تلقائياً ويعطيك $5 رصيد مجاني شهرياً (يكفي للبوت طول الشهر).

### بدائل مجانية:
- **Replit**: ارفع المجلد → اضغط Run (يحتاج Always-On أو UptimeRobot)
- **Render**: New Background Worker → Connect repo → نفس المتغيرات

---

## 🤖 دعوة البوت لسيرفرك

```
https://discord.com/api/oauth2/authorize?client_id=DISCORD_CLIENT_ID&permissions=8&scope=bot%20applications.commands
```
استبدل `DISCORD_CLIENT_ID` بالـ Application ID حقك.

---

## ✨ الميزات الجاهزة

| الميزة | الأمر / الحدث |
|--------|----------------|
| Welcome / Goodbye | تلقائي عند انضمام/مغادرة عضو |
| Auto Responder | ردود تلقائية حسب الكلمات المحددة |
| Slash Commands | `/ping` `/warn` `/kick` `/ban` `/clear` `/userinfo` `/serverinfo` |
| Mod Logs | كل أوامر الإدارة تُحفظ في قاعدة البيانات وتظهر بالداشبورد |
| Auto Sync | معلومات السيرفر تتحدث تلقائياً عند انضمام البوت |

---

## 🔧 تشغيل محلي للتجربة

```bash
cp .env.example .env
# عبّي القيم
npm install
npm start
```
