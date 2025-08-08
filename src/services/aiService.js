const ModelClient = require("@azure-rest/ai-inference").default;
const { isUnexpected } = require("@azure-rest/ai-inference");
const { AzureKeyCredential } = require("@azure/core-auth");

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4o";
const token = process.env["GITHUB_TOKEN"];

const client = ModelClient(endpoint, new AzureKeyCredential(token));

const generateDailyPrayers = async () => {
  try {
    // Türkiye saati ile bugünün gününü kontrol et
    const today = new Date();
    const turkeyTime = new Date(
      today.toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
    );
    const dayOfWeek = turkeyTime.getDay(); // 0 = Pazar, 5 = Cuma
    const isFriday = dayOfWeek === 5;

    let morningPrayerPrompt =
      "Motivasyonel, şükran dolu ve güne başlarken pozitif bir enerji veren bir dua yaz.";

    if (isFriday) {
      morningPrayerPrompt =
        "Cuma günü için özel bir sabah duası yaz. 'Hayırlı Cumalar' temasını içeren, Cuma gününün bereketini ve önemini vurgulayan, haftanın en kutsal günü için uygun bir dua olsun.";
    }

    const prompt = `
    Gündüz ve gece için iki kısa dua yazmanı istiyorum. Dualar Türkçe olacak ve dini/manevi içerikli olacak.
    
    Kurallar:
    - Her dua 2-3 cümle uzunluğunda olmalı
    - Günlük yaşamda okunmaya uygun olmalı
    
    İçerik:
    1. Sabah Duası: ${morningPrayerPrompt}
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

const generateUniversePrayers = async () => {
  try {
    let morningPrayerPrompt =
      "Evrensel enerji, kozmik bilinç ve ilahi güçle bağlantı kuran, evrenin sonsuzluğunu hisseden bir sabah duası yaz.";

    const prompt = `
    Evrensel ve kozmik temalı gündüz ve gece duaları yazmanı istiyorum. Dualar Türkçe olacak ve evrensel enerji, kozmik bilinç, ilahi güç temalarını içerecek.
    
    Kurallar:
    - Her dua 2-3 cümle uzunluğunda olmalı
    - Evrensel enerji ve kozmik bilinç temasını içermeli
    - Günlük yaşamda okunmaya uygun olmalı
    
    İçerik:
    1. Sabah Duası: ${morningPrayerPrompt}
    2. Gece Duası: Evrensel huzur veren, kozmik enerjiyle korunmayı içeren ve gece için uygun bir evrensel dua yaz.
    
    Lütfen şu formatta yaz:
    
    Sabah Duası: [sabah duası metni]  
    Gece Duası: [gece duası metni]
    `;

    console.log("Azure AI API isteği gönderiliyor (Universe)...");
    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          {
            role: "system",
            content:
              "Sen deneyimli bir evrensel dua yazarı ve kozmik metin uzmanısın. Kullanıcılara sabah, gece ve cuma günü için kısa, etkili, Türkçe evrensel dualar yazıyorsun. Duaların evrensel enerji, kozmik bilinç ve ilahi güç temalarını içeren, günlük hayata uygun, anlamlı ve ruhu besleyen nitelikte olmalı.",
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

    const aiResponse = response.body.choices[0].message.content;

    // AI yanıtını işle ve yapılandırılmış veriye dönüştür
    const morningPrayer = extractPrayer(aiResponse, "Sabah Duası");
    const nightPrayer = extractPrayer(aiResponse, "Gece Duası");

    return {
      morning: morningPrayer,
      night: nightPrayer,
    };
  } catch (error) {
    console.error("Azure AI hatası detayları (Universe):", {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
    });
    throw new Error(`Evrensel dualar oluşturulamadı: ${error.message}`);
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

module.exports = {
  generateDailyPrayers,
  generateUniversePrayers,
};
