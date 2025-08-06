require("dotenv").config();
const express = require("express");
const path = require("path");
const { connectDB } = require("./config/database");
const { startAllCronJobs } = require("./services/cronService");

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
app.post("/api/generate/prayer", async (req, res) => {
  try {
    const { password } = req.body;

    // Şifre kontrolü
    const correctPassword = process.env.GENERATE_PASSWORD || "admin123";

    if (!password || password !== correctPassword) {
      return res.status(401).json({
        success: false,
        error:
          "Geçersiz şifre. Dua oluşturmak için doğru şifreyi girmelisiniz.",
      });
    }

    const { generateDailyPrayers } = require("./services/aiService");
    const Prayer = require("./models/Prayer");

    // Önce eski duaları sil
    await Prayer.deleteMany({ type: "daily" });

    // AI ile dualar üret
    const prayers = await generateDailyPrayers();

    // Veritabanına kaydet
    const prayer = new Prayer({
      type: "daily",
      date: new Date(),
      prayers: {
        morning: prayers.morning,
        night: prayers.night,
      },
    });

    await prayer.save();

    res.json({
      success: true,
      message: "Eski dualar silindi ve yeni dualar başarıyla oluşturuldu",
      data: {
        prayerId: prayer._id,
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
