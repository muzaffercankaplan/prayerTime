const cron = require("node-cron");
const { generateDailyPrayers } = require("./aiService");
const { postPrayerToInstagram } = require("../instagram/postPrayerToInstagram");
const Prayer = require("../models/Prayer");

let isRunning = false;

// Rastgele saat belirleme (08:00-22:00 arası)
const getRandomPostTime = () => {
  const startHour = 8; // 08:00
  const endHour = 22; // 22:00

  const randomHour =
    Math.floor(Math.random() * (endHour - startHour + 1)) + startHour;
  const randomMinute = Math.floor(Math.random() * 60);

  return {
    hour: randomHour,
    minute: randomMinute,
    timeString: `${randomHour.toString().padStart(2, "0")}:${randomMinute
      .toString()
      .padStart(2, "0")}`,
  };
};

// Günlük dua üretimi ve paylaşımı
const generateAndSchedulePrayers = async () => {
  try {
    console.log("=== Günlük Dua Üretimi Başlatılıyor ===");

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
    console.log("Dualar veritabanına kaydedildi:", prayer._id);

    // Rastgele paylaşım saati belirle
    const postTime = getRandomPostTime();
    console.log(`Paylaşım saati belirlendi: ${postTime.timeString}`);

    // Paylaşım zamanını hesapla
    const now = new Date();
    const postDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      postTime.hour,
      postTime.minute
    );

    // Eğer belirlenen saat geçmişse, yarın için planla
    if (postDate <= now) {
      postDate.setDate(postDate.getDate() + 1);
    }

    const delayMs = postDate.getTime() - now.getTime();

    console.log(
      `Paylaşım ${postTime.timeString} saatinde yapılacak (${Math.round(
        delayMs / 1000 / 60
      )} dakika sonra)`
    );

    // Zamanlanmış paylaşım
    setTimeout(async () => {
      try {
        await postPrayerToInstagram(prayer._id);
        console.log("Zamanlanmış paylaşım tamamlandı");
      } catch (error) {
        console.error("Zamanlanmış paylaşım hatası:", error);
      }
    }, delayMs);

    return {
      prayerId: prayer._id,
      postTime: postTime.timeString,
      scheduledFor: postDate,
    };
  } catch (error) {
    console.error("Günlük dua üretimi hatası:", error);
    throw error;
  }
};

// Cron servisini başlat
const startCronService = () => {
  if (isRunning) {
    console.log("Cron servisi zaten çalışıyor");
    return;
  }

  console.log("Cron servisi başlatılıyor...");

  // Her gün 07:00'de çalış
  cron.schedule(
    "0 7 * * *",
    async () => {
      console.log("=== CRON: Günlük dua üretimi başlatılıyor ===");
      try {
        await generateAndSchedulePrayers();
      } catch (error) {
        console.error("Cron görevi hatası:", error);
      }
    },
    {
      timezone: "Europe/Istanbul",
    }
  );

  isRunning = true;
  console.log("Cron servisi başlatıldı - Her gün 07:00'de çalışacak");
};

// Manuel test fonksiyonu
const testDailyProcess = async () => {
  console.log("=== MANUEL TEST: Günlük süreç test ediliyor ===");
  try {
    const result = await generateAndSchedulePrayers();
    console.log("Test sonucu:", result);
    return result;
  } catch (error) {
    console.error("Test hatası:", error);
    throw error;
  }
};

module.exports = {
  startCronService,
  testDailyProcess,
};
