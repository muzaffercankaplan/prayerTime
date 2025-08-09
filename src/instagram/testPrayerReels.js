const { generatePrayerReelsVideo } = require("./reelsGenerator");
const path = require("path");
const fs = require("fs");

async function testPrayerReels() {
  try {
    console.log("🧪 Prayer Time Reels testi başlatılıyor...");

    // Test dua verisi
    const testPrayer = {
      prayers: {
        morning:
          "Allah'ım, bugün bana verdiğin nimetler için sana şükrediyorum. Beni ve ailemi koru, bize hayırlı işler nasip et. Amin.",
        night:
          "Allah'ım, bugün yaptığım hataları affet. Yarın daha iyi bir gün olması için bana güç ver. Beni ve sevdiklerimi koru. Amin.",
      },
      date: new Date(),
      type: "daily",
    };

    // Rastgele video seç (1-6 arası)
    const videoNumber = Math.floor(Math.random() * 6) + 1;
    const videoPath = path.join(__dirname, "../assets", `${videoNumber}.mp4`);
    const outputPath = path.join(__dirname, "../publish/test_reels.mp4");

    if (!fs.existsSync(videoPath)) {
      throw new Error(`${videoNumber}.mp4 dosyası bulunamadı!`);
    }

    console.log(`📹 Video ${videoNumber} seçildi: ${videoPath}`);

    // Sabah duası testi
    console.log("🌅 Sabah duası testi...");
    const morningParams = {
      videoPath,
      prayerTitle: null,
      prayerText: testPrayer.prayers.morning,
      outputPath: path.join(__dirname, "../publish/morning-prayer.mp4"),
      bottomMessage: null,
    };

    const morningResult = await generatePrayerReelsVideo(morningParams);
    console.log("✅ Sabah duası videosu oluşturuldu:", morningResult);

    // 5 saniye bekle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Gece duası testi
    const nightParams = {
      videoPath,
      prayerTitle: null,
      prayerText: testPrayer.prayers.night,
      outputPath: path.join(__dirname, "../publish/night-prayer.mp4"),
      bottomMessage: null,
    };

    const nightResult = await generatePrayerReelsVideo(nightParams);
  } catch (error) {
    console.error("❌ Test hatası:", error);
  }
}

// Test çalıştır
testPrayerReels();
