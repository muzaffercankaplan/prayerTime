const cron = require("node-cron");
const {
  generateDailyPrayers,
  generateUniversePrayers,
} = require("../services/aiService");
const { sendErrorNotification } = require("../services/emailService");
const Prayer = require("../models/Prayer");

// Random cron job'ları import et
const { startRandomCronJobs } = require("./randomCronService");

// İstanbul timezone ayarları
const ISTANBUL_TIMEZONE = "Europe/Istanbul";

// Singleton pattern için global değişkenler
let cronJobsStarted = false;
let cronJobs = [];

// Cron job'ları durdurma fonksiyonu
const stopAllCronJobs = () => {
  cronJobs.forEach((job) => {
    if (job && typeof job.stop === "function") {
      job.stop();
    }
  });
  cronJobs = [];
  cronJobsStarted = false;
  console.log("Tüm cron job'lar durduruldu");
};

// Dua üretme servisi (her gün gece 5'te çalışır)
const schedulePrayerGeneration = () => {
  const job = cron.schedule(
    "0 5 * * *",
    async () => {
      console.log("=== Dua Üretme Servisi Çalışıyor ===");
      try {
        // AI ile daily dualar üret
        const dailyPrayers = await generateDailyPrayers();

        // Daily duaları veritabanına kaydet
        const dailyPrayer = new Prayer({
          type: "daily",
          date: new Date(),
          prayers: {
            morning: dailyPrayers.morning,
            night: dailyPrayers.night,
          },
        });

        await dailyPrayer.save();

        // AI ile universe dualar üret
        const universePrayers = await generateUniversePrayers();

        // Universe duaları veritabanına kaydet
        const universePrayer = new Prayer({
          type: "universe",
          date: new Date(),
          prayers: {
            morning: universePrayers.morning,
            night: universePrayers.night,
          },
        });

        await universePrayer.save();

        return {
          success: true,
          dailyPrayerId: dailyPrayer._id,
          universePrayerId: universePrayer._id,
        };
      } catch (error) {
        console.error("Dua üretme hatası:", error);
        try {
          await sendErrorNotification("Dua Üretme Servisi", error, {
            İşlem: "Günlük dua üretimi",
            Zaman: new Date().toLocaleString("tr-TR"),
          });
        } catch (emailError) {
          console.error("Hata bildirimi gönderilemedi:", emailError);
        }
        throw error;
      }
    },
    {
      timezone: ISTANBUL_TIMEZONE,
    }
  );
  cronJobs.push(job);
};

// Tüm cron job'ları başlat
const startAllCronJobs = () => {
  // Eğer cron job'lar zaten başlatılmışsa, tekrar başlatma
  if (cronJobsStarted) {
    console.log("Cron job'lar zaten başlatılmış, tekrar başlatılmıyor");
    return;
  }

  console.log("Cron job'lar başlatılıyor...");

  schedulePrayerGeneration();

  // Random saatli job'ları başlat
  startRandomCronJobs();

  cronJobsStarted = true;
  console.log("Tüm cron job'lar başlatıldı");
};

// Process sonlandırma sinyallerini dinle
process.on("SIGTERM", () => {
  console.log("SIGTERM sinyali alındı, cron job'lar durduruluyor...");
  stopAllCronJobs();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT sinyali alındı, cron job'lar durduruluyor...");
  stopAllCronJobs();
  process.exit(0);
});

module.exports = {
  startAllCronJobs,
  stopAllCronJobs,
};
