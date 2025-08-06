const axios = require("axios");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Axios instance oluştur - DNS sorunları için daha uzun timeout
const instagramApi = axios.create({
  timeout: 120000, // 2 dakika timeout
});

const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
const userId = process.env.INSTAGRAM_USER_ID;

const createContainer = async (videoUrl, caption) => {
  try {
    const response = await instagramApi.post(
      `https://graph.instagram.com/v23.0/${userId}/media`,
      {
        media_type: "REELS",
        video_url: videoUrl,
        caption: caption,
        access_token: accessToken,
      }
    );

    return response.data.id;
  } catch (error) {
    console.error(
      "Container oluşturma hatası:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const publishReel = async (creationId) => {
  try {
    const response = await instagramApi.post(
      `https://graph.instagram.com/v23.0/${userId}/media_publish`,
      {
        creation_id: creationId,
        access_token: accessToken,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Reel yayınlama hatası:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const uploadReel = async (caption) => {
  try {
    console.log("Instagram Reels yükleniyor...");

    // Publish dizinindeki reels.mp4 dosyasını kullan
    const reelsPath = path.join(__dirname, "../publish/reels.mp4");

    // Video dosyasının varlığını kontrol et
    if (!fs.existsSync(reelsPath)) {
      throw new Error(`Video dosyası bulunamadı: ${reelsPath}`);
    }

    // Public erişilebilir video URL'si oluştur (prayer-assets route'unu kullan)
    const baseUrl =
      process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    const videoUrl = `${baseUrl}/prayer-assets/reels.mp4`;

    console.log("📤 Public video URL:", videoUrl);

    // 1. Media Container Oluştur (REELS için)
    const containerId = await createContainer(videoUrl, caption);
    console.log("Container oluşturuldu:", containerId);

    // 2. Container işleme durumunu kontrol et
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const statusResponse = await instagramApi.get(
        `https://graph.instagram.com/v23.0/${containerId}`,
        {
          params: {
            fields: "status_code",
            access_token: accessToken,
          },
        }
      );

      const statusCode = statusResponse.data.status_code;

      if (statusCode === "FINISHED") {
        break;
      } else if (statusCode === "ERROR") {
        throw new Error("Media container işleme hatası");
      } else if (statusCode === "EXPIRED") {
        throw new Error("Media container süresi doldu");
      }

      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 saniye bekle
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Media container işleme zaman aşımı");
    }

    // 3. Reels olarak yayınla
    console.log("📤 Reels yayınlanıyor...");
    const result = await publishReel(containerId);
    console.log("Reels başarıyla yayınlandı:", result);

    return result;
  } catch (error) {
    console.error("Instagram Reels yükleme hatası:", error);
    throw error;
  }
};

const checkAccountStatus = async () => {
  try {
    const response = await instagramApi.get(
      `https://graph.instagram.com/v23.0/${userId}`,
      {
        params: {
          fields: "id,username,account_type",
          access_token: accessToken,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Hesap durumu kontrol hatası:",
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = {
  uploadReel,
  checkAccountStatus,
};
