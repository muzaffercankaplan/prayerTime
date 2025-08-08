require("dotenv").config();
const express = require("express");
const path = require("path");
const { connectDB } = require("./config/database");
const { startAllCronJobs } = require("./cron/cronService");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving - publish klasörü için
app.use("/prayer-assets", express.static(path.join(__dirname, "publish")));

// MongoDB bağlantısı
connectDB();

// Cron servislerini başlat
startAllCronJobs(); // Tüm cron servislerini başlat

// Root endpoint - basit mesaj
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Prayer Time API",
    status: "running",
    version: "1.0.0",
  });
});

// Duaları oluştur endpoint'i
app.post("/api/generate/:type", async (req, res) => {
  try {
    const { password } = req.body;
    const { type } = req.params;

    // Şifre kontrolü
    const correctPassword = process.env.GENERATE_PASSWORD || "admin123";

    if (!password || password !== correctPassword) {
      return res.status(401).json({
        success: false,
        error:
          "Geçersiz şifre. Dua oluşturmak için doğru şifreyi girmelisiniz.",
      });
    }

    // Type kontrolü
    if (!["daily", "universe"].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Geçersiz tip. Sadece 'daily' veya 'universe' kabul edilir.",
      });
    }

    const {
      generateDailyPrayers,
      generateUniversePrayers,
    } = require("./services/aiService");
    const Prayer = require("./models/Prayer");

    // Önce eski duaları sil (sadece belirtilen tip için)
    await Prayer.deleteMany({ type: type });

    let prayers;
    let prayerId;

    if (type === "daily") {
      // AI ile daily dualar üret
      prayers = await generateDailyPrayers();
    } else if (type === "universe") {
      // AI ile universe dualar üret
      prayers = await generateUniversePrayers();
    }

    // Veritabanına kaydet
    const prayer = new Prayer({
      type: type,
      date: new Date(),
      prayers: {
        morning: prayers.morning,
        night: prayers.night,
      },
    });

    await prayer.save();

    res.json({
      success: true,
      message: `Eski ${type} dualar silindi ve yeni ${type} dualar başarıyla oluşturuldu`,
      data: {
        prayerId: prayer._id,
        type: prayer.type,
        morning: prayers.morning,
        night: prayers.night,
        createdAt: prayer.createdAt,
      },
    });
  } catch (error) {
    console.error("Dua üretme hatası:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`prayerTime server running on port ${PORT}`);
});
