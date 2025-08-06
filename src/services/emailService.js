require("dotenv").config();
const { Resend } = require("resend");

async function sendEmail(subject, message) {
  // Environment değişkenlerini kontrol et
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment değişkeni bulunamadı");
  }

  if (!process.env.EMAIL_TO) {
    throw new Error("EMAIL_TO environment değişkeni bulunamadı");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const EMAIL_TO = process.env.EMAIL_TO;

  console.log("Email gönderiliyor:", subject, message);

  try {
    const emailMessage = message || "";

    // Modern ve kutulu HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f4f6fb;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 8px 32px rgba(44,62,80,0.10);
            padding: 32px 24px 24px 24px;
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .header-title {
            font-size: 2rem;
            font-weight: 700;
            color: #5f27cd;
            margin-bottom: 6px;
          }
          .header-date {
            font-size: 1rem;
            color: #636e72;
            margin-bottom: 0;
          }
          .section {
            margin-bottom: 32px;
          }
          .section-title {
            font-size: 1.15rem;
            font-weight: 600;
            color: #222f3e;
            margin-bottom: 16px;
            letter-spacing: 0.5px;
            border-left: 4px solid #5f27cd;
            padding-left: 10px;
          }
          .status-list {
            margin: 0;
            padding: 0;
            list-style: none;
          }
          .status-item {
            display: flex;
            align-items: center;
            background: #f7f9fa;
            border-radius: 10px;
            padding: 14px 18px;
            margin-bottom: 10px;
            font-size: 1rem;
            font-weight: 500;
            border-left: 6px solid #dfe6e9;
            box-shadow: 0 2px 8px rgba(44,62,80,0.04);
          }
          .status-success {
            border-left-color: #00b894;
            background: #eafaf1;
            color: #218c5a;
          }
          .status-warning {
            border-left-color: #fdcb6e;
            background: #fff9e6;
            color: #b27d00;
          }
          .status-error {
            border-left-color: #d63031;
            background: #fdeaea;
            color: #b71c1c;
          }
          .status-icon {
            font-size: 1.4em;
            margin-right: 12px;
            flex-shrink: 0;
          }
          .footer {
            text-align: center;
            color: #636e72;
            font-size: 0.95rem;
            margin-top: 32px;
            padding-top: 18px;
            border-top: 1px solid #e0e0e0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-title">🕌 Prayer Time Raporu</div>
            <div class="header-date">${new Date().toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              timeZone: "Europe/Istanbul",
            })}</div>
          </div>

          <div class="section">
            <div class="section-title">Dua Bilgileri</div>
            <ul class="status-list">
              ${(() => {
                // Satırları işle
                const lines = emailMessage.split("\n");
                let result = "";
                const statusMap = [
                  {
                    key: "Sabah duası başarıyla paylaşıldı",
                    icon: "✅",
                    cls: "status-success",
                  },
                  {
                    key: "Sabah duası paylaşım hatası",
                    icon: "❌",
                    cls: "status-error",
                  },
                  {
                    key: "Akşam duası başarıyla paylaşıldı",
                    icon: "✅",
                    cls: "status-success",
                  },
                  {
                    key: "Akşam duası paylaşım hatası",
                    icon: "❌",
                    cls: "status-error",
                  },
                  {
                    key: "Yeni dua üretildi ve kaydedildi",
                    icon: "🆕",
                    cls: "status-success",
                  },
                  {
                    key: "Dua üretme hatası",
                    icon: "❌",
                    cls: "status-error",
                  },
                ];
                statusMap.forEach(({ key, icon, cls }) => {
                  const line = lines.find((l) => l.includes(key));
                  if (line) {
                    result += `<li class="status-item ${cls}"><span class="status-icon">${icon}</span>${line}</li>`;
                  }
                });
                return result;
              })()}
            </ul>
          </div>

          <div class="section">
            <ul class="status-list">
              ${(() => {
                // Sistem kontrolü tamamlandı satırı
                const lines = emailMessage.split("\n");
                const systemLine = lines.find((l) =>
                  l.includes("Sistem kontrolü tamamlandı")
                );
                if (systemLine) {
                  return `<li class="status-item status-success"><span class="status-icon">🚀</span>${systemLine}</li>`;
                }
                return "";
              })()}
            </ul>
          </div>

          <div class="footer">
            Bu rapor otomatik olarak oluşturulmuştur.<br>
            <b>Prayer Time Sistemi</b>
          </div>
        </div>
      </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: EMAIL_TO,
      subject: subject,
      html: htmlContent,
    });

    console.log("Email başarıyla gönderildi:", data);
    return data;
  } catch (error) {
    console.error("Email gönderme hatası:", error);
    throw error;
  }
}

async function sendErrorNotification(serviceName, error, additionalInfo = {}) {
  // Environment değişkenlerini kontrol et
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment değişkeni bulunamadı");
  }

  if (!process.env.EMAIL_TO) {
    throw new Error("EMAIL_TO environment değişkeni bulunamadı");
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const EMAIL_TO = process.env.EMAIL_TO;

  console.log("Hata bildirimi gönderiliyor:", serviceName, error.message);

  try {
    const currentTime = new Date().toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
    });
    const errorDetails =
      error.stack || error.message || "Hata detayı bulunamadı";

    // Hata bildirimi için HTML template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f4f6fb;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #fff;
            border-radius: 18px;
            box-shadow: 0 8px 32px rgba(44,62,80,0.10);
            padding: 32px 24px 24px 24px;
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .header-title {
            font-size: 2rem;
            font-weight: 700;
            color: #d63031;
            margin-bottom: 6px;
          }
          .header-subtitle {
            font-size: 1.1rem;
            color: #636e72;
            margin-bottom: 0;
          }
          .header-date {
            font-size: 0.9rem;
            color: #636e72;
            margin-bottom: 0;
          }
          .section {
            margin-bottom: 32px;
          }
          .section-title {
            font-size: 1.15rem;
            font-weight: 600;
            color: #222f3e;
            margin-bottom: 16px;
            letter-spacing: 0.5px;
            border-left: 4px solid #d63031;
            padding-left: 10px;
          }
          .error-info {
            background: #fdeaea;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 6px solid #d63031;
          }
          .error-service {
            font-size: 1.1rem;
            font-weight: 600;
            color: #d63031;
            margin-bottom: 10px;
          }
          .error-message {
            font-size: 1rem;
            color: #b71c1c;
            margin-bottom: 15px;
            line-height: 1.5;
          }
          .error-details {
            background: #fff;
            border-radius: 8px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            color: #2d3436;
            border: 1px solid #e0e0e0;
            max-height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
          }
          .additional-info {
            background: #fff9e6;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 20px;
            border-left: 6px solid #fdcb6e;
          }
          .additional-info h4 {
            margin: 0 0 10px 0;
            color: #b27d00;
            font-size: 1rem;
          }
          .additional-info p {
            margin: 0;
            color: #636e72;
            font-size: 0.95rem;
          }
          .footer {
            text-align: center;
            color: #636e72;
            font-size: 0.95rem;
            margin-top: 32px;
            padding-top: 18px;
            border-top: 1px solid #e0e0e0;
          }
          .action-buttons {
            text-align: center;
            margin-top: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
            gap: 3px;
          }
          .action-button {
            display: inline-block;
            background: #5f27cd;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 8px;
            margin: 0 10px;
            font-size: 0.9rem;
            transition: background 0.3s;
          }
          .action-button:hover {
            background: #4a1fa8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-title">🚨 Sistem Hatası</div>
            <div class="header-subtitle">Prayer Time Sistemi</div>
            <div class="header-date">${currentTime}</div>
          </div>

          <div class="section">
            <div class="section-title">Hata Detayları</div>
            <div class="error-info">
              <div class="error-service">${serviceName}</div>
              <div class="error-message">${error.message}</div>
              <div class="error-details">${errorDetails}</div>
            </div>
          </div>

          ${
            Object.keys(additionalInfo).length > 0
              ? `
          <div class="section">
            <div class="section-title">Ek Bilgiler</div>
            <div class="additional-info">
              ${Object.entries(additionalInfo)
                .map(
                  ([key, value]) => `
                <h4>${key}:</h4>
                <p>${value}</p>
              `
                )
                .join("")}
            </div>
          </div>
          `
              : ""
          }

          <div class="action-buttons">
            <a href="https://api.prayertime.site/health" class="action-button">Kontrol Et</a>
            <a href="http://api.prayertime.site/health" class="action-button">http</a>
          </div>

          <div class="footer">
            Bu hata bildirimi otomatik olarak oluşturulmuştur.<br>
            <b>Prayer Time Sistemi</b>
          </div>
        </div>
      </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: EMAIL_TO,
      subject: `🚨 Prayer Time Hatası: ${serviceName}`,
      html: htmlContent,
    });

    console.log("Hata bildirimi başarıyla gönderildi:", data);
    return data;
  } catch (emailError) {
    console.error("Hata bildirimi gönderme hatası:", emailError);
    throw emailError;
  }
}

// Başarılı işlem sonrası bilgilendirme e-postası
async function sendInfoNotification(serviceName, info, additionalInfo = {}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment değişkeni bulunamadı");
  }
  if (!process.env.EMAIL_TO) {
    throw new Error("EMAIL_TO environment değişkeni bulunamadı");
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const EMAIL_TO = process.env.EMAIL_TO;
  try {
    const currentTime = new Date().toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
    });
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 18px; box-shadow: 0 8px 32px rgba(44,62,80,0.10); padding: 32px 24px 24px 24px; }
          .header { text-align: center; margin-bottom: 32px; }
          .header-title { font-size: 2rem; font-weight: 700; color: #00b894; margin-bottom: 6px; }
          .header-date { font-size: 1rem; color: #636e72; margin-bottom: 0; }
          .info-box { background: #eafaf1; border-left: 6px solid #00b894; border-radius: 10px; padding: 20px; margin-bottom: 20px; color: #218c5a; font-size: 1.1rem; }
          .footer { text-align: center; color: #636e72; font-size: 0.95rem; margin-top: 32px; padding-top: 18px; border-top: 1px solid #e0e0e0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-title">ℹ️ ${serviceName} Bilgilendirme</div>
            <div class="header-date">${currentTime}</div>
          </div>
          <div class="info-box">${info}</div>
          ${
            Object.keys(additionalInfo).length > 0
              ? `<div class="info-box">${Object.entries(additionalInfo)
                  .map(([k, v]) => `<b>${k}:</b> ${v}`)
                  .join("<br>")}</div>`
              : ""
          }
          <div class="footer">Bu bilgilendirme otomatik olarak oluşturulmuştur.<br><b>Prayer Time Sistemi</b></div>
        </div>
      </body>
      </html>
    `;
    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: EMAIL_TO,
      subject: `ℹ️ Prayer Time Bilgi: ${serviceName}`,
      html: htmlContent,
    });
    // console.log("Bilgilendirme e-postası başarıyla gönderildi:", data);
    return data;
  } catch (emailError) {
    console.error("Bilgilendirme e-postası gönderme hatası:", emailError);
    throw emailError;
  }
}

module.exports = { sendEmail, sendErrorNotification, sendInfoNotification };
