const cron = require("node-cron");
const { generateDailyPrayers } = require("./aiService");
const { postPrayerToInstagram } = require("../instagram/postPrayerToInstagram");
const { sendErrorNotification } = require("./emailService");
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
  console.log("Dua üretme servisi başlatılıyor...");

  const job = cron.schedule(
    "0 5 * * *",
    async () => {
      console.log("=== Dua Üretme Servisi Çalışıyor ===");
      try {
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

        return { success: true, prayerId: prayer._id };
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

  console.log(
    "Dua üretme servisi başlatıldı - Her gün gece 05:00'de çalışacak"
  );
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
