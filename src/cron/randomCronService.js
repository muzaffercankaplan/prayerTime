const cron = require("node-cron");
const DailySchedule = require("../models/DailySchedule");
const DailyExecution = require("../models/DailyExecution");
const {
  sendInfoNotification,
  sendErrorNotification,
} = require("../services/emailService");
const { postPrayerToInstagram } = require("../instagram/postPrayerToInstagram");

// İstanbul timezone ayarları
const ISTANBUL_TIMEZONE = "Europe/Istanbul";

// Singleton pattern için global değişkenler
let randomCronJobsStarted = false;
let randomCronJobs = [];

// Random cron job'ları durdurma fonksiyonu
const stopRandomCronJobs = () => {
  randomCronJobs.forEach((job) => {
    if (job && typeof job.stop === "function") {
      job.stop();
    }
  });
  randomCronJobs = [];
  randomCronJobsStarted = false;
};

// Rastgele zaman ayarlayıcı fonksiyon
const getRandomTime = async (
  startHour,
  endHour,
  currentHour = null,
  isFirstTime = false,
  jobKey = null
) => {
  // Geçmiş saatlerdeki job'lar için hemen çalıştır (5 dakika sonra)
  if (
    currentHour !== null &&
    currentHour >= startHour &&
    currentHour <= endHour
  ) {
    // Job'un daha önce çalıştırılıp çalıştırılmadığını kontrol et
    if (jobKey) {
      const today = new Date().toLocaleDateString("tr-TR");
      const execution = await DailyExecution.findOne({
        date: today,
        jobKey: jobKey,
      });

      if (execution && execution.executed) {
        return null; // Zaten çalıştırılmış, atla
      }
    }

    const fiveMinutesLater = new Date();
    fiveMinutesLater.setMinutes(fiveMinutesLater.getMinutes() + 5);
    return {
      hour: fiveMinutesLater.getHours(),
      minute: fiveMinutesLater.getMinutes(),
      cronExpression: `${fiveMinutesLater.getMinutes()} ${fiveMinutesLater.getHours()} * * *`,
      immediate: true,
    };
  }

  // Eğer currentHour verilmişse, o saatten sonraki zamanları seç
  let actualStartHour = startHour;
  if (currentHour !== null && currentHour >= startHour) {
    actualStartHour = currentHour + 1; // Bir sonraki saatten başla
  }

  // Eğer başlangıç saati bitiş saatinden büyükse, bugün için uygun zaman yok
  if (actualStartHour > endHour) {
    return null;
  }

  // endHour dahil değil! (örn: 11-12 arası sadece 11:00-11:59)
  const maxHour = endHour - 1;
  const randomHour =
    Math.floor(Math.random() * (maxHour - actualStartHour + 1)) +
    actualStartHour;
  const randomMinute = Math.floor(Math.random() * 60);
  return {
    hour: randomHour,
    minute: randomMinute,
    cronExpression: `${randomMinute} ${randomHour} * * *`,
    immediate: false,
  };
};

// Günlük random saatleri veritabanından al veya oluştur
const getDailyRandomTimes = async () => {
  const today = new Date().toLocaleDateString("tr-TR");
  const currentHour = parseInt(
    new Date().toLocaleString("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "numeric",
      hour12: false,
    })
  );

  try {
    // Veritabanından bugünün planını kontrol et
    let dailySchedule = await DailySchedule.findOne({ date: today });
    const isFirstTime = !dailySchedule;

    if (!dailySchedule) {
      // Bugün için plan yoksa yeni oluştur
      dailySchedule = new DailySchedule({ date: today });

      // Job tanımlarını al
      const jobDefinitions = getJobDefinitions();

      // Her job için random saat belirle
      for (const job of jobDefinitions) {
        const timeKey = getTimeKey(job.jobName);
        if (timeKey) {
          const randomTime = await getRandomTime(
            job.startHour,
            job.endHour,
            currentHour,
            isFirstTime,
            timeKey
          );

          if (randomTime) {
            dailySchedule.randomTimes.set(timeKey, {
              hour: randomTime.hour,
              minute: randomTime.minute,
              daysOfWeek: job.daysOfWeek,
              immediate: randomTime.immediate || false,
            });
          }
        }
      }

      await dailySchedule.save();
    } else {
      // Bugün için plan zaten var, mevcut planı kullan

      // Mevcut planı kontrol et ve geçmiş saatlerdeki job'ları immediate yap
      const jobDefinitions = getJobDefinitions();
      let planUpdated = false;

      for (const job of jobDefinitions) {
        const timeKey = getTimeKey(job.jobName);
        if (timeKey && dailySchedule.randomTimes.has(timeKey)) {
          const timeInfo = dailySchedule.randomTimes.get(timeKey);

          // Eğer job'un saati geçmişse ve immediate değilse, immediate yap
          if (timeInfo.hour <= currentHour && !timeInfo.immediate) {
            timeInfo.immediate = true;
            planUpdated = true;
          }
        } else {
          // Job mevcut planda yok, ekle

          const randomTime = await getRandomTime(
            job.startHour,
            job.endHour,
            currentHour,
            false,
            timeKey
          );
          if (randomTime) {
            dailySchedule.randomTimes.set(timeKey, {
              hour: randomTime.hour,
              minute: randomTime.minute,
              daysOfWeek: job.daysOfWeek,
              immediate: randomTime.immediate || false,
            });
            planUpdated = true;
          }
        }
      }

      if (planUpdated) {
        await dailySchedule.save();
      }
    }

    // Map'i normal objeye çevir
    const randomTimes = {};
    dailySchedule.randomTimes.forEach((value, key) => {
      randomTimes[key] = value;
    });

    return randomTimes;
  } catch (error) {
    console.error("Günlük random saatler alınırken hata:", error);
    throw error;
  }
};

// Job tanımları
const getJobDefinitions = () => [
  {
    startHour: 8,
    endHour: 9,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    jobFunction: () => postPrayerToInstagram("morning"),
    jobName: "Sabah Duası",
  },
  {
    startHour: 20,
    endHour: 22,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    jobFunction: () => postPrayerToInstagram("night"),
    jobName: "Akşam Duası",
  },
];

// Job tipine göre time key belirle
const getTimeKey = (jobName) => {
  if (jobName.includes("Sabah")) return "morning_prayer";
  if (jobName.includes("Akşam")) return "evening_prayer";
  return "";
};

// Job'ları planla ve çalıştır
const scheduleJobs = async (jobs, randomTimes, day) => {
  const plannedJobs = [];

  // Job'ları random saatlere göre planla
  for (const job of jobs) {
    const timeKey = getTimeKey(job.jobName);
    const timeInfo = randomTimes[timeKey];

    if (timeInfo && timeInfo.daysOfWeek.includes(day)) {
      const cronExpression = `${timeInfo.minute} ${timeInfo.hour} * * *`;
      const isImmediate = timeInfo.immediate || false;

      plannedJobs.push({
        name: job.jobName,
        hour: timeInfo.hour,
        minute: timeInfo.minute,
        cronExpression,
        jobFunction: job.jobFunction,
        immediate: isImmediate,
      });
    } else {
    }
  }

  // Cron job'ları oluştur
  for (const j of plannedJobs) {
    const executeJob = async () => {
      try {
        // Job'un daha önce çalışıp çalışmadığını kontrol et
        const today = new Date().toLocaleDateString("tr-TR");
        const timeKey = getTimeKey(j.name);

        let execution = await DailyExecution.findOne({
          date: today,
          jobKey: timeKey,
        });

        if (!execution) {
          // İlk kez çalışacak, kayıt oluştur
          execution = new DailyExecution({
            date: today,
            jobKey: timeKey,
            jobName: j.name,
            plannedTime: { hour: j.hour, minute: j.minute },
          });
        }

        if (execution.executed) {
          return;
        }

        // Job'u çalıştır
        await j.jobFunction();

        // Başarılı çalıştırmayı kaydet
        execution.executed = true;
        execution.executedAt = new Date();
        await execution.save();
      } catch (error) {
        console.error(`${j.name} paylaşım hatası:`, error);
        try {
          await sendErrorNotification(`${j.name} Paylaşım`, error, {
            İşlem: `${j.name} paylaşımı`,
            Zaman: new Date().toLocaleString("tr-TR"),
          });
        } catch (emailError) {
          console.error("Hata bildirimi gönderilemedi:", emailError);
        }
      }
    };

    if (j.immediate) {
      // Hemen çalıştır (5 dakika sonra)
      setTimeout(executeJob, 2 * 60 * 1000); // 2 dakika
    } else {
      // Normal cron job olarak planla
      const scheduledJob = cron.schedule(j.cronExpression, executeJob, {
        timezone: ISTANBUL_TIMEZONE,
      });
    }
  }

  return plannedJobs;
};

// Her gün için random saatli cron job'ları başlat
const startRandomCronJobs = () => {
  // Eğer random cron job'lar zaten başlatılmışsa, tekrar başlatma
  if (randomCronJobsStarted) {
    return;
  }

  const jobs = getJobDefinitions();

  // Her gün saat 07:00'da random saatleri belirle ve job'ları planla
  const dailyScheduler = cron.schedule(
    "0 7 * * *",
    async () => {
      try {
        const randomTimes = await getDailyRandomTimes();
        const today = new Date();
        const day = today.getDay();

        const plannedJobs = await scheduleJobs(jobs, randomTimes, day);

        // Toplu bilgilendirme maili gönder
        if (plannedJobs.length > 0) {
          const tarih = today.toLocaleDateString("tr-TR", {
            weekday: "long",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: "Europe/Istanbul",
          });
          const info = plannedJobs
            .map(
              (j) =>
                `<b>${j.name}:</b> ${j.hour
                  .toString()
                  .padStart(2, "0")}:${j.minute.toString().padStart(2, "0")}`
            )
            .join("<br>");
          await sendInfoNotification(
            "Günün Random Paylaşım Planı",
            `Dua Zamanı:<br><b>Tarih:</b> ${tarih}<br><br>${info}`
          );
        }
      } catch (error) {
        console.error("Günlük random job planlama hatası:", error);
        try {
          await sendErrorNotification("Günlük Random Job Planlama", error, {
            İşlem: "Günlük random job'ları planlama",
            Zaman: new Date().toLocaleString("tr-TR"),
          });
        } catch (emailError) {
          console.error("Hata bildirimi gönderilemedi:", emailError);
        }
      }
    },
    {
      timezone: ISTANBUL_TIMEZONE,
    }
  );
  randomCronJobs.push(dailyScheduler);

  // Servis başlatıldığında eğer bugün için random saatler belirlenmişse hemen planla
  const initializeTodayJobs = async () => {
    try {
      const today = new Date();
      const currentHour = parseInt(
        today.toLocaleString("tr-TR", {
          timeZone: "Europe/Istanbul",
          hour: "numeric",
          hour12: false,
        })
      );
      const day = today.getDay();

      // Eğer saat 07:00'dan sonra servis başlatıldıysa, bugün için job'ları hemen planla
      if (currentHour >= 7) {
        const randomTimes = await getDailyRandomTimes();
        const plannedJobs = await scheduleJobs(jobs, randomTimes, day);

        if (plannedJobs.length > 0) {
          // Eğer ilk defa oluşturuluyorsa email gönder
          const existingSchedule = await DailySchedule.findOne({
            date: today.toLocaleDateString("tr-TR"),
          });
          const isFirstTime =
            !existingSchedule || existingSchedule.randomTimes.size === 0;

          if (isFirstTime) {
            const tarih = today.toLocaleDateString("tr-TR", {
              weekday: "long",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              timeZone: "Europe/Istanbul",
            });
            const info = plannedJobs
              .map(
                (j) =>
                  `<b>${j.name}:</b> ${j.hour
                    .toString()
                    .padStart(2, "0")}:${j.minute.toString().padStart(2, "0")}${
                    j.immediate ? " (Hemen çalışacak)" : ""
                  }`
              )
              .join("<br>");
            await sendInfoNotification(
              "Günün Random Paylaşım Planı - İlk Oluşturma",
              `Bugün için ilk defa random paylaşım planı oluşturuldu:<br><b>Tarih:</b> ${tarih}<br><b>Saat:</b> ${currentHour}:${today
                .getMinutes()
                .toString()
                .padStart(2, "0")}<br><br>${info}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Servis başlatma sırasında job planlama hatası:", error);
    }
  };

  // Servis başlatıldığında hemen çalıştır
  initializeTodayJobs();

  randomCronJobsStarted = true;
};

module.exports = {
  startRandomCronJobs,
  stopRandomCronJobs,
};
