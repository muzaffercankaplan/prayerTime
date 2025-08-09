const Prayer = require("../models/Prayer");
const { generatePrayerReelsVideo } = require("./reelsGenerator");
const { uploadReel } = require("./instagramService");

const path = require("path");
const fs = require("fs");

// Tarih karşılaştırma fonksiyonu (Türkiye saati ile)
function isToday(date) {
  // Türkiye saat dilimini kullan
  const today = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Istanbul",
  });
  const docDate = new Date(date).toLocaleString("en-US", {
    timeZone: "Europe/Istanbul",
  });

  // Tarih karşılaştırması için sadece tarih kısmını al
  const todayDate = new Date(today);
  const docDateOnly = new Date(docDate);

  return (
    todayDate.getDate() === docDateOnly.getDate() &&
    todayDate.getMonth() === docDateOnly.getMonth() &&
    todayDate.getFullYear() === docDateOnly.getFullYear()
  );
}

// Yardımcı: async bekleme
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const postPrayerToInstagram = async (prayerType = null) => {
  try {
    console.log(`Dua paylaşımı başlatılıyor... Type: ${prayerType}`);

    // Türkiye saatini al
    const turkeyTime = new Date().toLocaleString("en-US", {
      timeZone: "Europe/Istanbul",
    });
    const today = new Date(turkeyTime);
    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD formatında

    // Bugünün tarihine ait daily dua verisini ara
    const prayer = await Prayer.findOne({ type: "daily" }).sort({
      createdAt: -1,
    });

    if (!prayer) {
      throw new Error("Veritabanında hiç dua verisi bulunamadı");
    }

    // isToday fonksiyonu ile tarih kontrolü
    if (!isToday(prayer.date)) {
      const prayerDate = new Date(prayer.date);
      const prayerDateString = prayerDate.toISOString().split("T")[0];
      throw new Error(
        `Bugünün tarihi (${todayString}) ile uyumlu dua verisi bulunamadı. En son veri: ${prayerDateString}`
      );
    }

    // Eğer prayerType belirtilmişse onu kullan, yoksa saate göre belirle
    let prayerText, timeLabel;
    if (prayerType === "morning") {
      prayerText = prayer.prayers.morning;
      timeLabel = "Sabah Duası";
    } else if (prayerType === "night") {
      prayerText = prayer.prayers.night;
      timeLabel = "Gece Duası";
    } else {
      // Türkiye saatine göre belirle
      const currentHour = new Date(turkeyTime).getHours();
      const isMorning = currentHour >= 6 && currentHour < 18; // 06:00-18:00 arası sabah
      prayerText = isMorning ? prayer.prayers.morning : prayer.prayers.night;
      timeLabel = isMorning ? "Sabah Duası" : "Gece Duası";
    }

    // Rastgele video seç (1-6 arası)
    const videoNumber = Math.floor(Math.random() * 6) + 1;
    const videoPath = path.join(__dirname, "../assets", `${videoNumber}.mp4`);

    // Saate göre output path belirle
    let outputFileName;
    if (prayerType === "morning") {
      outputFileName = "morning-prayer.mp4";
    } else if (prayerType === "night") {
      outputFileName = "night-prayer.mp4";
    } else {
      const currentHour = new Date(turkeyTime).getHours();
      const isMorning = currentHour >= 6 && currentHour < 18;
      outputFileName = isMorning ? "morning-prayer.mp4" : "night-prayer.mp4";
    }
    const outputPath = path.join(__dirname, "../publish", outputFileName);

    if (!fs.existsSync(videoPath)) {
      throw new Error(`${videoNumber}.mp4 dosyası bulunamadı!`);
    }

    const reelsParams = {
      videoPath,
      prayerTitle: null, // Başlık yok
      prayerText: prayerText, // Sadece dua metni
      outputPath,
      bottomMessage: null, // Alt mesaj yok
    };

    console.log("Dua verisi:", reelsParams);

    // Video oluştur
    const generatedVideoPath = await generatePrayerReelsVideo(reelsParams);
    console.log("✅ Reels videosu oluşturuldu:", generatedVideoPath);

    // Instagram'a yükle
    const caption = `${prayerText}\n\n#dua #prayer #islam #müslüman #günlükdua`;
    console.log("Instagram'a yükleniyor...");

    try {
      const result = await uploadReel(caption);
      console.log("✅ Dua başarıyla Instagram'a paylaşıldı:", result);
      return result;
    } catch (instagramError) {
      if (instagramError.message.includes("Application request limit")) {
        console.log("⚠️ Instagram rate limit aşıldı, 30 saniye bekleniyor...");
        await wait(30000);
        const retryResult = await uploadReel(caption);
        console.log(
          "✅ Tekrar deneme sonrası dua başarıyla Instagram'a paylaşıldı:",
          retryResult
        );
        return retryResult;
      }
      throw instagramError;
    }
  } catch (error) {
    console.error("❌ Dua paylaşım hatası:", error);
    throw error;
  }
};

const postPrayerUniverse = async (prayerType = null) => {
  try {
    console.log(`Evrensel dua paylaşımı başlatılıyor... Type: ${prayerType}`);

    // Türkiye saatini al
    const turkeyTime = new Date().toLocaleString("en-US", {
      timeZone: "Europe/Istanbul",
    });
    const today = new Date(turkeyTime);
    const todayString = today.toISOString().split("T")[0]; // YYYY-MM-DD formatında

    // Bugünün tarihine ait evrensel dua verisini ara
    const prayer = await Prayer.findOne({ type: "universe" }).sort({
      createdAt: -1,
    });

    if (!prayer) {
      throw new Error("Veritabanında hiç evrensel dua verisi bulunamadı");
    }

    // isToday fonksiyonu ile tarih kontrolü
    if (!isToday(prayer.date)) {
      const prayerDate = new Date(prayer.date);
      const prayerDateString = prayerDate.toISOString().split("T")[0];
      throw new Error(
        `Bugünün tarihi (${todayString}) ile uyumlu evrensel dua verisi bulunamadı. En son veri: ${prayerDateString}`
      );
    }

    // Eğer prayerType belirtilmişse onu kullan, yoksa saate göre belirle
    let prayerText, timeLabel;
    if (prayerType === "morning") {
      prayerText = prayer.prayers.morning;
      timeLabel = "Evrensel Sabah Enerjisi";
    } else if (prayerType === "night") {
      prayerText = prayer.prayers.night;
      timeLabel = "Evrensel Gece Enerjisi";
    } else {
      // Türkiye saatine göre belirle
      const currentHour = new Date(turkeyTime).getHours();
      const isMorning = currentHour >= 6 && currentHour < 18; // 06:00-18:00 arası sabah
      prayerText = isMorning ? prayer.prayers.morning : prayer.prayers.night;
      timeLabel = isMorning
        ? "Evrensel Sabah Enerjisi"
        : "Evrensel Gece Enerjisi";
    }

    // Rastgele video seç (1-6 arası)
    const videoNumber = Math.floor(Math.random() * 6) + 1;
    const videoPath = path.join(__dirname, "../assets", `${videoNumber}.mp4`);

    // Saate göre output path belirle
    let outputFileName;
    if (prayerType === "morning") {
      outputFileName = "morning-universe.mp4";
    } else if (prayerType === "night") {
      outputFileName = "night-universe.mp4";
    } else {
      const currentHour = new Date(turkeyTime).getHours();
      const isMorning = currentHour >= 6 && currentHour < 18;
      outputFileName = isMorning
        ? "morning-universe.mp4"
        : "night-universe.mp4";
    }
    const outputPath = path.join(__dirname, "../publish", outputFileName);

    if (!fs.existsSync(videoPath)) {
      throw new Error(`${videoNumber}.mp4 dosyası bulunamadı!`);
    }

    const reelsParams = {
      videoPath,
      prayerTitle: null, // Başlık yok
      prayerText: prayerText, // Sadece dua metni
      outputPath,
      bottomMessage: null, // Alt mesaj yok
      isUniverse: true, // Evrensel tema
    };

    console.log("Evrensel dua verisi:", reelsParams);

    // Video oluştur
    const generatedVideoPath = await generatePrayerReelsVideo(reelsParams);
    console.log("✅ Evrensel reels videosu oluşturuldu:", generatedVideoPath);

    // Instagram'a yükle
    const caption = `${prayerText}\n\n#evrenselenerji #kozmikbilinç #evrenselsevgi #pozitifenerji #evrenseliyilik #kozmos #evrenselışık`;
    console.log("Instagram'a yükleniyor...");

    try {
      const result = await uploadReel(caption);
      console.log("✅ Evrensel dua başarıyla Instagram'a paylaşıldı:", result);
      return result;
    } catch (instagramError) {
      if (instagramError.message.includes("Application request limit")) {
        console.log("⚠️ Instagram rate limit aşıldı, 30 saniye bekleniyor...");
        await wait(30000);
        const retryResult = await uploadReel(caption);
        console.log(
          "✅ Tekrar deneme sonrası evrensel dua başarıyla Instagram'a paylaşıldı:",
          retryResult
        );
        return retryResult;
      }
      throw instagramError;
    }
  } catch (error) {
    console.error("❌ Evrensel dua paylaşım hatası:", error);
    throw error;
  }
};

module.exports = {
  postPrayerToInstagram,
  postPrayerUniverse,
};
