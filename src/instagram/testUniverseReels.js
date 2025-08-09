const { generatePrayerReelsVideo } = require("./reelsGenerator");
const path = require("path");
const fs = require("fs");

async function testUniverseReels() {
  try {
    console.log("🧪 Evrensel Dua Reels testi başlatılıyor...");

    // Test evrensel dua verisi
    const testUniversePrayer = {
      prayers: {
        morning:
          "Uyanışımda evrenin sonsuz enerjisini hissediyor, kozmik bilinçle kalbimi yeniliyorum. İlahi güçle korunarak, her adımımda ışığın rehberliğiyle ilerlemeyi diliyorum",
        night:
          "Gece boyunca evrenin sonsuz enerjisini hissediyor, kozmik bilinçle kalbimi yeniliyorum. İlahi güçle korunarak, her adımımda ışığın rehberliğiyle ilerlemeyi diliyorum",
      },
      date: new Date(),
      type: "universe",
    };

    // Rastgele video seç (1-6 arası)
    const videoNumber = Math.floor(Math.random() * 6) + 1;
    const videoPath = path.join(__dirname, "../assets", `${videoNumber}.mp4`);
    const outputPath = path.join(
      __dirname,
      "../publish/test_universe_reels.mp4"
    );

    if (!fs.existsSync(videoPath)) {
      throw new Error(`${videoNumber}.mp4 dosyası bulunamadı!`);
    }

    console.log(`📹 Video ${videoNumber} seçildi: ${videoPath}`);

    // Evrensel sabah duası testi
    console.log("🌅 Evrensel Sabah Enerjisi testi...");
    const morningParams = {
      videoPath,
      prayerTitle: null,
      prayerText: testUniversePrayer.prayers.morning,
      outputPath: path.join(__dirname, "../publish/morning-universe.mp4"),
      bottomMessage: null,
      isUniverse: true, // Evrensel tema
    };

    const morningResult = await generatePrayerReelsVideo(morningParams);
    console.log("✅ Evrensel sabah duası videosu oluşturuldu:", morningResult);

    // 5 saniye bekle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Evrensel gece duası testi
    console.log("🌙 Evrensel Gece Enerjisi testi...");
    const nightParams = {
      videoPath,
      prayerTitle: null,
      prayerText: testUniversePrayer.prayers.night,
      outputPath: path.join(__dirname, "../publish/night-universe.mp4"),
      bottomMessage: null,
      isUniverse: true, // Evrensel tema
    };

    const nightResult = await generatePrayerReelsVideo(nightParams);

    // Dosya boyutlarını kontrol et
    const morningFile = path.join(__dirname, "../publish/morning-universe.mp4");
    const nightFile = path.join(__dirname, "../publish/night-universe.mp4");

    if (fs.existsSync(morningFile)) {
      const morningStats = fs.statSync(morningFile);
      console.log(
        `   📊 Sabah videosu boyutu: ${(
          morningStats.size /
          1024 /
          1024
        ).toFixed(2)} MB`
      );
    }

    if (fs.existsSync(nightFile)) {
      const nightStats = fs.statSync(nightFile);
      console.log(
        `   📊 Gece videosu boyutu: ${(nightStats.size / 1024 / 1024).toFixed(
          2
        )} MB`
      );
    }
  } catch (error) {
    console.error("❌ Evrensel test hatası:", error);
  }
}

// Test çalıştır
testUniverseReels();
