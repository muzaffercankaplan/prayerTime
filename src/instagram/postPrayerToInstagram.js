const Prayer = require("../models/Prayer");
const { uploadReel, checkAccountStatus } = require("./instagramService");

const postPrayerToInstagram = async (prayerId) => {
  try {
    console.log(`Dua paylaşımı başlatılıyor... Prayer ID: ${prayerId}`);

    // Veritabanından duayı al
    const prayer = await Prayer.findById(prayerId);
    if (!prayer) {
      throw new Error("Dua bulunamadı");
    }

    // Şu anki saate göre hangi duayı paylaşacağımızı belirle
    const currentHour = new Date().getHours();
    const isMorning = currentHour >= 6 && currentHour < 18; // 06:00-18:00 arası sabah
    const prayerText = isMorning
      ? prayer.prayers.morning
      : prayer.prayers.night;
    const timeLabel = isMorning ? "Sabah Duası" : "Gece Duası";

    // Video URL'si (şimdilik placeholder, gerçek video oluşturma servisi eklenecek)
    const videoUrl = "https://example.com/prayer-video.mp4"; // Bu kısım video oluşturma servisi ile değiştirilecek

    // Caption oluştur
    const caption = `${timeLabel}\n\n${prayerText}\n\n#dua #prayer #sabah #gece #islam #müslüman #allah #rabbim`;

    console.log("Instagram'a paylaşım yapılıyor...");
    console.log("Caption:", caption);

    // Instagram'a yükle
    const result = await uploadReel(videoUrl, caption);

    console.log("Dua başarıyla Instagram'a paylaşıldı:", result);
    return result;
  } catch (error) {
    console.error("Dua paylaşım hatası:", error);
    throw error;
  }
};

const testInstagramConnection = async () => {
  try {
    console.log("Instagram bağlantısı test ediliyor...");
    const accountStatus = await checkAccountStatus();
    console.log("Instagram hesap durumu:", accountStatus);
    return accountStatus;
  } catch (error) {
    console.error("Instagram bağlantı test hatası:", error);
    throw error;
  }
};

module.exports = {
  postPrayerToInstagram,
  testInstagramConnection,
};
