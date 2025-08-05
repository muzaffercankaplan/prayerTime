const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4o";
const token = process.env["GITHUB_TOKEN"];

const client = ModelClient(endpoint, new AzureKeyCredential(token));

const generateDailyPrayers = async () => {
  try {
    const prompt = `
    Gündüz ve gece için iki kısa dua yazmanı istiyorum. Dualar Türkçe olacak ve dini/manevi içerikli olacak.
    
    Kurallar:
    - Her dua 2-3 cümle uzunluğunda olmalı
    - Günlük yaşamda okunmaya uygun olmalı
    
    İçerik:
    1. Sabah Duası: Motivasyonel, şükran dolu ve güne başlarken pozitif bir enerji veren bir dua yaz.
    2. Gece Duası: Huzur veren, Allah'a sığınmayı içeren ve gece için uygun bir korunma duası yaz.
    
    Lütfen şu formatta yaz:
    
    Sabah Duası: [sabah duası metni]  
    Gece Duası: [gece duası metni]
    `;

    console.log("Azure AI API isteği gönderiliyor...");
    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          {
            role: "system",
            content:
              "Sen deneyimli bir dua yazarı ve dini metin uzmanısın. Kullanıcılara sabah, gece ve cuma günü için kısa, etkili, Türkçe dualar yazıyorsun. Duaların günlük hayata uygun, anlamlı ve ruhu besleyen nitelikte olmalı.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        top_p: 1,
        model: model,
      },
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    console.log("Azure AI API yanıtı alındı");
    const aiResponse = response.body.choices[0].message.content;
    console.log("API Yanıtı:", aiResponse);

    // AI yanıtını işle ve yapılandırılmış veriye dönüştür
    const morningPrayer = extractPrayer(aiResponse, "Sabah Duası");
    const nightPrayer = extractPrayer(aiResponse, "Gece Duası");

    return {
      morning: morningPrayer,
      night: nightPrayer,
    };
  } catch (error) {
    console.error("Azure AI hatası detayları:", {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
    });
    throw new Error(`Dualar oluşturulamadı: ${error.message}`);
  }
};

const extractPrayer = (text, prayerType) => {
  // Markdown formatını temizle
  const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "");

  // Farklı formatları dene
  const patterns = [
    new RegExp(`${prayerType}:\\s*["""]?([^\\n"]*)["""]?`, "i"),
    new RegExp(`${prayerType}\\s*["""]?([^\\n"]*)["""]?`, "i"),
    new RegExp(`${prayerType}:\\s*([^\\n]*)`, "i"),
    new RegExp(`${prayerType}\\s*([^\\n]*)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const prayer = match[1].trim();
      if (prayer && prayer.length > 10) {
        return prayer;
      }
    }
  }

  console.log(`Dua bulunamadı: ${prayerType}`);
  console.log("Temizlenmiş metin:", cleanText);
  return "";
};

const generateFridayMessage = async () => {
  try {
    const prompt = `
    Cuma günü için özel bir "Hayırlı Cumalar" mesajı yaz. Bu mesaj:
    
    - Cuma gününün önemini vurgulamalı
    - Hayırlı ve bereketli olmasını dilemeli
    - Dini ve manevi içerikli olmalı
    - 2-3 cümle uzunluğunda olmalı
    - Türkçe olmalı
    
    Lütfen şu formatta yaz:
    
    Cuma Mesajı: [cuma mesajı]
    `;

    console.log("Cuma mesajı için Azure AI API isteği gönderiliyor...");
    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          {
            role: "system",
            content:
              "Sen deneyimli bir dua yazarı ve dini metin uzmanısın. Cuma günü için özel mesajlar yazıyorsun.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        top_p: 1,
        model: model,
      },
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    console.log("Cuma mesajı için Azure AI API yanıtı alındı");
    const aiResponse = response.body.choices[0].message.content;
    console.log("Cuma Mesajı API Yanıtı:", aiResponse);

    // AI yanıtını işle
    const fridayMessage = extractPrayer(aiResponse, "Cuma Mesajı");

    return fridayMessage;
  } catch (error) {
    console.error("Cuma mesajı oluşturma hatası:", error);
    throw new Error(`Cuma mesajı oluşturulamadı: ${error.message}`);
  }
};

module.exports = {
  generateDailyPrayers,
  generateFridayMessage,
};
