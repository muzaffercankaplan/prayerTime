const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const { createCanvas } = require("canvas");

// FFmpeg path'lerini ayarla
const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Prayer Time reels videosu oluşturur: video + kart + dua metni + opsiyonel müzik
 * @param {string} videoPath - Giriş videosu dosya yolu
 * @param {string} prayerTitle - Kartta gösterilecek dua başlığı
 * @param {string} prayerText - Kartta gösterilecek dua metni
 * @param {string} outputPath - Çıkış videosu dosya yolu
 * @param {string} [musicPath] - Opsiyonel müzik dosya yolu
 * @param {string} [bottomMessage] - Alt mesaj
 * @param {boolean} [isUniverse] - Evrensel tema için
 * @returns {Promise<string>} - Çıktı video dosya yolu
 */
async function generatePrayerReelsVideo({
  videoPath,
  prayerTitle,
  prayerText,
  outputPath,
  musicPath,
  bottomMessage,
  isUniverse = false,
}) {
  // 1. Kart overlay görselini oluştur
  let overlayPath;
  try {
    if (isUniverse) {
      overlayPath = await createUniverseOverlayImage(
        videoPath,
        prayerTitle,
        prayerText,
        bottomMessage
      );
    } else {
      overlayPath = await createPrayerOverlayImage(
        videoPath,
        prayerTitle,
        prayerText,
        bottomMessage
      );
    }
  } catch (err) {
    console.error("❌ Overlay görseli oluşturulamadı:", err.message, err);
    throw err;
  }

  // 2. Logo overlay görselini hazırla (opsiyonel)
  const { loadImage, createCanvas } = require("canvas");

  // isUniverse parametresine göre logo seç
  const logoFileName = isUniverse ? "universe.png" : "prayer.png";
  const logoPath = require("path").join(__dirname, "../assets", logoFileName);
  let logoOverlayPath = null;

  // Logo dosyası varsa kullan
  if (require("fs").existsSync(logoPath)) {
    try {
      // Videodan çözünürlük al
      const getVideoSize = () =>
        new Promise((resolve, reject) => {
          ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);
            const { width, height } =
              metadata.streams.find((s) => s.width && s.height) || {};
            if (!width || !height)
              return reject(new Error("Video çözünürlüğü alınamadı."));
            resolve({ width, height });
          });
        });
      const { width, height } = await getVideoSize();
      const logoSize = Math.floor(height * 0.09); // Daha küçük logo
      const canvas = createCanvas(logoSize, logoSize);
      const ctx = canvas.getContext("2d");
      const logo = await loadImage(logoPath);
      ctx.save();
      ctx.globalAlpha = 1; // Tam opaklık
      ctx.beginPath();
      ctx.arc(logoSize / 2, logoSize / 2, logoSize / 2, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(logo, 0, 0, logoSize, logoSize);
      ctx.restore();
      logoOverlayPath = require("path").join(__dirname, "tmp_logo_overlay.png");
      const out = fs.createWriteStream(logoOverlayPath);
      const stream = canvas.createPNGStream();
      await new Promise((res, rej) => {
        stream.pipe(out);
        out.on("finish", res);
        out.on("error", rej);
      });
    } catch (e) {
      console.log("⚠️ Logo yüklenemedi, logo olmadan devam ediliyor");
      logoOverlayPath = null;
    }
  } else {
    console.log(
      `ℹ️ ${logoFileName} dosyası bulunamadı, logo olmadan devam ediliyor`
    );
  }

  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath).outputOptions("-y").input(overlayPath);

    // Logo varsa ekle
    if (logoOverlayPath) {
      command = command.input(logoOverlayPath);
    }

    // Logo varsa ve müzik varsa
    if (logoOverlayPath && musicPath) {
      command = command
        .input(musicPath)
        .complexFilter([
          "[0:v][1:v] overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto[tmp1]",
          "[tmp1][2:v] overlay=32:32:format=auto [v]",
          "[3:a]volume=1[a2]",
          "[0:a][a2]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        ])
        .outputOptions("-map", "[v]")
        .outputOptions("-map", "[aout]")
        .outputOptions("-t", "15");
    }
    // Logo varsa ama müzik yoksa
    else if (logoOverlayPath && !musicPath) {
      command = command
        .complexFilter([
          "[0:v][1:v] overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto[tmp1]",
          "[tmp1][2:v] overlay=32:32:format=auto [v]",
        ])
        .outputOptions("-map", "[v]")
        .outputOptions("-map", "0:a?")
        .outputOptions("-t", "15");
    }
    // Logo yoksa ama müzik varsa
    else if (!logoOverlayPath && musicPath) {
      command = command
        .input(musicPath)
        .complexFilter([
          "[0:v][1:v] overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto [v]",
          "[2:a]volume=1[a2]",
          "[0:a][a2]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        ])
        .outputOptions("-map", "[v]")
        .outputOptions("-map", "[aout]")
        .outputOptions("-t", "15");
    }
    // Logo yoksa ve müzik de yoksa
    else {
      command = command
        .complexFilter([
          "[0:v][1:v] overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto [v]",
        ])
        .outputOptions("-map", "[v]")
        .outputOptions("-map", "0:a?")
        .outputOptions("-t", "15");
    }

    command
      .output(outputPath)
      .on("stderr", (stderrLine) => {
        console.log("[ffmpeg stderr]", stderrLine);
      })
      .on("end", () => {
        // Geçici overlay görsellerini sil
        try {
          fs.unlinkSync(overlayPath);
        } catch (e) {}
        if (logoOverlayPath) {
          try {
            fs.unlinkSync(logoOverlayPath);
          } catch (e) {}
        }
        resolve(outputPath);
      })
      .on("error", (err) => {
        try {
          fs.unlinkSync(overlayPath);
        } catch (e) {}
        if (logoOverlayPath) {
          try {
            fs.unlinkSync(logoOverlayPath);
          } catch (e) {}
        }
        reject(err);
      })
      .run();
  });
}

/**
 * Prayer Time overlay görseli oluşturur
 * @param {string} videoPath - Video dosya yolu
 * @param {string} prayerTitle - Dua başlığı
 * @param {string} prayerText - Dua metni
 * @param {string} bottomMessage - Alt mesaj
 * @returns {Promise<string>} - Overlay görsel dosya yolu
 */
async function createPrayerOverlayImage(
  videoPath,
  prayerTitle,
  prayerText,
  bottomMessage
) {
  // Videodan çözünürlük al
  const getVideoSize = () =>
    new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(err);
        const { width, height } =
          metadata.streams.find((s) => s.width && s.height) || {};
        if (!width || !height)
          return reject(new Error("Video çözünürlüğü alınamadı."));
        resolve({ width, height });
      });
    });
  const { width, height } = await getVideoSize();
  const cardW = Math.floor(width * 0.7); // Genişlik artırıldı
  const cardH = Math.floor(height * 0.4); // Kart yüksekliği daha da kısaltıldı

  const canvas = createCanvas(cardW, cardH);
  const ctx = canvas.getContext("2d");

  // Dua card arka planı - daha hoş renk
  ctx.fillStyle = "#1a1a2e"; // Koyu lacivert - daha şık
  ctx.globalAlpha = 0.95; // Neredeyse tam opak
  // Yuvarlatılmış dikdörtgen (border-radius) - daha da küçük radius
  const radius = Math.floor(cardH * 0.03); // Radius daha da kısaltıldı
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(cardW - radius, 0);
  ctx.quadraticCurveTo(cardW, 0, cardW, radius);
  ctx.lineTo(cardW, cardH - radius);
  ctx.quadraticCurveTo(cardW, cardH, cardW - radius, cardH);
  ctx.lineTo(radius, cardH);
  ctx.quadraticCurveTo(0, cardH, 0, cardH - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();
  ctx.fillRect(0, 0, cardW, cardH);
  ctx.restore();

  // İnce altın kenarlık ekle
  ctx.strokeStyle = "#d4af37"; // Altın rengi
  ctx.lineWidth = 2;
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Dua temasına uygun dekoratif elementler
  drawPrayerDecorations(ctx, cardW, cardH);

  // Sadece dua metni - ortada
  const textFontSize = 48; // İçerik fontu
  const topMargin = Math.floor(cardH * 0.1); // Üstten boşluk

  // Dua metni ortada
  if (prayerText) {
    // Dua temasına uygun metin rengi - altın tonu
    ctx.fillStyle = "#f4e4bc"; // Açık altın rengi
    ctx.font = `bold ${textFontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Metin gölgesi ekle
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Kartın tam ortasında - dikey ortalama için
    const centerY = cardH / 2;
    wrapText(
      ctx,
      prayerText,
      cardW / 2,
      centerY,
      cardW * 0.9,
      textFontSize + 8
    );

    // Gölge efektini sıfırla
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // PNG olarak kaydet
  const overlayPath = path.join(__dirname, "tmp_prayer_overlay.png");
  const out = fs.createWriteStream(overlayPath);
  const stream = canvas.createPNGStream();
  await new Promise((res, rej) => {
    stream.pipe(out);
    out.on("finish", res);
    out.on("error", rej);
  });
  return overlayPath;
}

/**
 * Evrensel tema için overlay görseli oluşturur
 * @param {string} videoPath - Video dosya yolu
 * @param {string} prayerTitle - Başlık
 * @param {string} prayerText - Dua metni
 * @param {string} bottomMessage - Alt mesaj
 * @returns {Promise<string>} - Overlay dosya yolu
 */
async function createUniverseOverlayImage(
  videoPath,
  prayerTitle,
  prayerText,
  bottomMessage
) {
  // Videodan çözünürlük al
  const getVideoSize = () =>
    new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) return reject(err);
        const { width, height } =
          metadata.streams.find((s) => s.width && s.height) || {};
        if (!width || !height)
          return reject(new Error("Video çözünürlüğü alınamadı."));
        resolve({ width, height });
      });
    });
  const { width, height } = await getVideoSize();
  const cardW = Math.floor(width * 0.7);
  const cardH = Math.floor(height * 0.4);

  const canvas = createCanvas(cardW, cardH);
  const ctx = canvas.getContext("2d");

  // Evrensel tema arka planı - kozmik mavi tonları
  const gradient = ctx.createLinearGradient(0, 0, cardW, cardH);
  gradient.addColorStop(0, "#0a0a2e"); // Koyu kozmik mavi
  gradient.addColorStop(0.5, "#16213e"); // Orta kozmik mavi
  gradient.addColorStop(1, "#0f3460"); // Açık kozmik mavi

  ctx.globalAlpha = 0.95;
  const radius = Math.floor(cardH * 0.03);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(cardW - radius, 0);
  ctx.quadraticCurveTo(cardW, 0, cardW, radius);
  ctx.lineTo(cardW, cardH - radius);
  ctx.quadraticCurveTo(cardW, cardH, cardW - radius, cardH);
  ctx.lineTo(radius, cardH);
  ctx.quadraticCurveTo(0, cardH, 0, cardH - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, cardW, cardH);
  ctx.restore();

  // Kozmik ışık kenarlık
  ctx.strokeStyle = "#4fc3f7"; // Kozmik mavi ışık
  ctx.lineWidth = 2;
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Evrensel dekoratif elementler
  drawUniverseDecorations(ctx, cardW, cardH);

  // Dua metni - ortada
  const textFontSize = 48;
  const topMargin = Math.floor(cardH * 0.1);

  if (prayerText) {
    // Evrensel tema metin rengi - kozmik ışık
    ctx.fillStyle = "#e3f2fd"; // Açık kozmik mavi
    ctx.font = `bold ${textFontSize}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Kozmik ışık gölgesi
    ctx.shadowColor = "rgba(79, 195, 247, 0.6)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const centerY = cardH / 2;
    wrapText(
      ctx,
      prayerText,
      cardW / 2,
      centerY,
      cardW * 0.9,
      textFontSize + 8
    );

    // Gölge efektini sıfırla
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // PNG olarak kaydet
  const overlayPath = path.join(__dirname, "tmp_universe_overlay.png");
  const out = fs.createWriteStream(overlayPath);
  const stream = canvas.createPNGStream();
  await new Promise((res, rej) => {
    stream.pipe(out);
    out.on("finish", res);
    out.on("error", rej);
  });
  return overlayPath;
}

/**
 * Metni belirli genişlikte sarar ve dikey olarak ortalar
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Sarılacak metin
 * @param {number} x - X koordinatı
 * @param {number} y - Y koordinatı (merkez)
 * @param {number} maxWidth - Maksimum genişlik
 * @param {number} lineHeight - Satır yüksekliği
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let lines = [];
  let line = "";

  // Önce satırları hesapla
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + " ";
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  // Toplam yüksekliği hesapla
  const totalHeight = lines.length * lineHeight;

  // Başlangıç Y pozisyonunu hesapla (ortalamak için)
  const startY = y - totalHeight / 2 + lineHeight / 2;

  // Satırları çiz
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

/**
 * Dua temasına uygun dekoratif elementler çizer
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Genişlik
 * @param {number} height - Yükseklik
 */
function drawPrayerDecorations(ctx, width, height) {
  // Köşelerde dua temasına uygun dekoratif elementler
  const cornerSize = Math.min(width, height) * 0.12; // Boyut artırıldı
  const margin = Math.min(width, height) * 0.05; // Kenar boşluğu

  // Altın rengi
  ctx.fillStyle = "#d4af37";
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.85; // Opaklık ayarlandı

  // Sol üst köşe - Allah (الله)
  drawCornerDecorationWithSymbol(ctx, margin, margin, cornerSize, "الله");

  // Sağ üst köşe - Muhammed (محمد)
  drawCornerDecorationWithSymbol(
    ctx,
    width - cornerSize - margin,
    margin,
    cornerSize,
    "محمد"
  );

  // Sol alt köşe - Bismillah (بسم)
  drawCornerDecorationWithSymbol(
    ctx,
    margin,
    height - cornerSize - margin,
    cornerSize,
    "بسم"
  );

  // Sağ alt köşe - Subhanallah (سبحان)
  drawCornerDecorationWithSymbol(
    ctx,
    width - cornerSize - margin,
    height - cornerSize - margin,
    cornerSize,
    "سبحان"
  );

  // Ortada hafif bir ışık efekti
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    height / 2
  );
  gradient.addColorStop(0, "rgba(212, 175, 55, 0.1)");
  gradient.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 1;
}

/**
 * Evrensel tema dekorasyonları çizer
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Genişlik
 * @param {number} height - Yükseklik
 */
function drawUniverseDecorations(ctx, width, height) {
  // Köşelerde evrensel semboller
  const cornerSize = Math.min(width, height) * 0.12;
  const margin = Math.min(width, height) * 0.05;

  // Kozmik mavi renk
  ctx.fillStyle = "#4fc3f7";
  ctx.strokeStyle = "#4fc3f7";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.85;

  // Sol üst köşe - Yıldız sembolü
  drawUniverseCornerDecoration(ctx, margin, margin, cornerSize, "★");

  // Sağ üst köşe - Ay sembolü
  drawUniverseCornerDecoration(
    ctx,
    width - cornerSize - margin,
    margin,
    cornerSize,
    "☾"
  );

  // Sol alt köşe - Güneş sembolü
  drawUniverseCornerDecoration(
    ctx,
    margin,
    height - cornerSize - margin,
    cornerSize,
    "☀"
  );

  // Sağ alt köşe - Sonsuzluk sembolü
  drawUniverseCornerDecoration(
    ctx,
    width - cornerSize - margin,
    height - cornerSize - margin,
    cornerSize,
    "∞"
  );

  // Ortada kozmik ışık efekti
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    height / 2
  );
  gradient.addColorStop(0, "rgba(79, 195, 247, 0.15)");
  gradient.addColorStop(1, "rgba(79, 195, 247, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 1;
}

/**
 * Evrensel köşe dekorasyonu çizer
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X koordinatı
 * @param {number} y - Y koordinatı
 * @param {number} size - Boyut
 * @param {string} symbol - Gösterilecek sembol
 */
function drawUniverseCornerDecoration(ctx, x, y, size, symbol) {
  ctx.save();
  ctx.translate(x, y);

  // Yuvarlatılmış dış çerçeve
  const radius = size * 0.1;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.stroke();

  // Evrensel sembol
  const fontSize = size * 0.5;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#4fc3f7";

  const centerX = size / 2;
  const centerY = size / 2;
  ctx.fillText(symbol, centerX, centerY);

  ctx.restore();
}

/**
 * Köşe dekorasyonu çizer - Arapça harfler ve İslami semboller
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X koordinatı
 * @param {number} y - Y koordinatı
 * @param {number} size - Boyut
 */
function drawCornerDecoration(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);

  // Dış çerçeve
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size, 0);
  ctx.lineTo(size, size);
  ctx.lineTo(0, size);
  ctx.closePath();
  ctx.stroke();

  // Arapça harfler ve İslami semboller
  const fontSize = size * 0.4;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#d4af37";

  // Köşe pozisyonlarına göre farklı semboller
  const centerX = size / 2;
  const centerY = size / 2;

  // Pozisyon kontrolü için global değişken kullanacağız
  // Şimdilik basit bir yaklaşım - sırayla farklı semboller
  const symbols = ["الله", "محمد", "بسم", "سبحان"];
  const symbolIndex = Math.floor(Math.random() * symbols.length);
  ctx.fillText(symbols[symbolIndex], centerX, centerY);

  ctx.restore();
}

/**
 * Belirli bir sembolle köşe dekorasyonu çizer
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X koordinatı
 * @param {number} y - Y koordinatı
 * @param {number} size - Boyut
 * @param {string} symbol - Gösterilecek Arapça sembol
 */
function drawCornerDecorationWithSymbol(ctx, x, y, size, symbol) {
  ctx.save();
  ctx.translate(x, y);

  // Hafif yuvarlatılmış dış çerçeve
  const cornerRadius = size * 0.1; // Hafif radius
  ctx.beginPath();
  ctx.moveTo(cornerRadius, 0);
  ctx.lineTo(size - cornerRadius, 0);
  ctx.quadraticCurveTo(size, 0, size, cornerRadius);
  ctx.lineTo(size, size - cornerRadius);
  ctx.quadraticCurveTo(size, size, size - cornerRadius, size);
  ctx.lineTo(cornerRadius, size);
  ctx.quadraticCurveTo(0, size, 0, size - cornerRadius);
  ctx.lineTo(0, cornerRadius);
  ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
  ctx.closePath();
  ctx.stroke();

  // Arapça harf
  const fontSize = size * 0.35;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#d4af37";

  const centerX = size / 2;
  const centerY = size / 2;
  ctx.fillText(symbol, centerX, centerY);

  ctx.restore();
}

module.exports = {
  generatePrayerReelsVideo,
  createPrayerOverlayImage,
};
