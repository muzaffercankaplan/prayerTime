const axios = require("axios");
require("dotenv").config();

const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
const userId = process.env.INSTAGRAM_USER_ID;
const baseUrl = "https://graph.facebook.com/v18.0";

const createContainer = async (videoUrl, caption) => {
  try {
    const response = await axios.post(`${baseUrl}/${userId}/media`, {
      media_type: "REELS",
      video_url: videoUrl,
      caption: caption,
      access_token: accessToken,
    });

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
    const response = await axios.post(`${baseUrl}/${userId}/media_publish`, {
      creation_id: creationId,
      access_token: accessToken,
    });

    return response.data;
  } catch (error) {
    console.error(
      "Reel yayınlama hatası:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const uploadReel = async (videoUrl, caption) => {
  try {
    console.log("Instagram Reels yükleniyor...");

    // Container oluştur
    const creationId = await createContainer(videoUrl, caption);
    console.log("Container oluşturuldu:", creationId);

    // Reels'i yayınla
    const result = await publishReel(creationId);
    console.log("Reels başarıyla yayınlandı:", result);

    return result;
  } catch (error) {
    console.error("Instagram Reels yükleme hatası:", error);
    throw error;
  }
};

const checkAccountStatus = async () => {
  try {
    const response = await axios.get(`${baseUrl}/${userId}`, {
      params: {
        fields: "id,username,account_type",
        access_token: accessToken,
      },
    });

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
