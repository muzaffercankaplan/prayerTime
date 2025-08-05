# PrayerTime - Instagram Dua Reels Paylaşım Projesi

Bu proje, gündüz ve gece için AI ile dua üreten ve Instagram Reels olarak paylaşan bir otomatik sistemdir.

## Proje Yapısı

```
prayerTime/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB Atlas bağlantısı
│   ├── models/
│   │   └── Prayer.js            # Dua modeli (morning, night alanları)
│   ├── services/
│   │   ├── aiService.js         # AI servisi (gündüz/gece dua üretimi)
│   │   ├── cronService.js       # Cron servisi (her gün 07:00'de çalışır)
│   │   └── instagramService.js  # Instagram Reels paylaşım servisi
│   └── instagram/
│       └── postPrayerToInstagram.js  # Instagram API entegrasyonu
├── .env.example                 # Örnek environment değişkenleri
├── package.json                 # Proje bağımlılıkları
└── README.md                   # Bu dosya
```

## Kurulum Adımları

### 1. MongoDB Atlas Bağlantısı ve Dua Modeli ✅

- [x] `src/config/database.js` - MongoDB Atlas bağlantı konfigürasyonu
- [x] `src/models/Prayer.js` - Dua modeli (morning, night field'ları ile)

### 2. AI Servisi ✅

- [x] `src/services/aiService.js` - OpenAI ile gündüz ve gece için dua üretimi
- [x] Gündüz duası: Sabah/öğlen için motivasyonel ve şükran duaları
- [x] Gece duası: Akşam/yatsı için huzur ve korunma duaları

### 3. Instagram Reels Paylaşım Servisi ✅

- [x] `src/services/instagramService.js` - Instagram API entegrasyonu
- [x] `src/instagram/postPrayerToInstagram.js` - Reels paylaşım fonksiyonu
- [x] Video oluşturma ve Instagram'a yükleme (placeholder)

### 4. Cron Servisi ✅

- [x] `src/services/cronService.js` - Her gün 07:00'de çalışan servis
- [x] Rastgele paylaşım saati belirleme (08:00-22:00 arası)
- [x] AI ile dua üretimi ve Instagram'a paylaşım

## Environment Değişkenleri

```env
MONGODB_URI=your_mongodb_atlas_connection_string
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
INSTAGRAM_USER_ID=your_instagram_user_id
OPENAI_API_KEY=your_openai_api_key
```

## Çalıştırma

```bash
npm install
npm start
```

## Özellikler

- 🤖 AI ile gündüz ve gece için özel dua üretimi
- 📱 Instagram Reels otomatik paylaşımı
- ⏰ Her gün 07:00'de çalışan cron servisi
- 🎲 Rastgele paylaşım saati belirleme
- 🗄️ MongoDB Atlas ile veri saklama
