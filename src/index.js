require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/database");
const {
  startCronService,
  testDailyProcess,
} = require("./services/cronService");

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB bağlantısı
connectDB();

// Cron servisini başlat
startCronService();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Test endpoint'i
app.get("/test", async (req, res) => {
  try {
    const result = await testDailyProcess();
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Duaları oluştur endpoint'i
app.post("/api/generate/prayer", async (req, res) => {
  try {
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

// Cuma mesajı oluştur endpoint'i
app.post("/api/generate/friday", async (req, res) => {
  try {
    const { generateFridayMessage } = require("./services/aiService");
    const Prayer = require("./models/Prayer");

    // AI ile cuma mesajı üret
    const fridayMessage = await generateFridayMessage();

    // Önce eski cuma mesajlarını sil
    await Prayer.deleteMany({ type: "friday" });

    // Yeni cuma mesajını kaydet
    const prayer = new Prayer({
      type: "friday",
      date: new Date(),
      prayers: {
        friday: fridayMessage,
      },
    });

    await prayer.save();

    res.json({
      success: true,
      message: "Cuma mesajı başarıyla oluşturuldu",
      data: {
        prayerId: prayer._id,
        friday: fridayMessage,
        createdAt: prayer.createdAt,
      },
    });
  } catch (error) {
    console.error("Cuma mesajı üretme hatası:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`prayerTime server running on port ${PORT}`);
});
