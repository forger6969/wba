/**
 * O'zbekcha (lotin) — draft translation.
 *
 * ⚠️ NEEDS A NATIVE REVIEW before it is treated as final marketing copy. The structure and
 * the technical terms are right; tone and phrasing should be checked by a native speaker.
 * Structure must mirror ru.js key for key — a missing key renders as `undefined`.
 */
export default {
  lang: { code: 'uz', label: 'UZ', switchTo: 'Русский', switchToCode: 'ru' },

  nav: {
    features: 'Imkoniyatlar',
    roles: 'Rollar',
    finance: 'Moliya',
    pricing: 'Tariflar',
    langSchool: 'Til markazlariga',
    courses: 'Kurs va repetitorlarga',
    vsExcel: "Excel o'rniga CRM",
    vsModme: 'Modme bilan taqqoslash',
    vsUmai: 'Umai CRM bilan taqqoslash',
    blog: 'Bilimlar bazasi',
    gamification: 'Motivatsiya',
    faq: 'Savol va javoblar',
    about: 'Kompaniya haqida',
    team: 'Jamoa',
    contacts: 'Aloqa',
    home: 'Bosh sahifa',
    login: 'Kirish',
    menu: 'Menyu',
    skipToContent: "Asosiy kontentga o'tish",
    primaryLabel: 'Asosiy navigatsiya',
    mobileLabel: 'Mobil menyu',
  },

  common: {
    trial: 'Birinchi hafta — bepul, karta va majburiyatsiz',
    leaderboardWeek: 'Reyting · Hafta',
    coins: '★ koinlar',
  },

  cta: {
    defaultTitle: "Markazingizda tartib o'rnatishga tayyormisiz?",
    defaultText:
      "LevelUp Academy'ni ulang va to'lovlar, o'quv jarayoni va motivatsiyani bugunoq bitta tizimga ko'chiring.",
    button: "Biz bilan bog'laning",
  },

  footer: {
    tagline: "O'quv markazi uchun CRM: moliya, o'quv jarayoni va motivatsiya bitta tizimda.",
    product: 'Mahsulot',
    navigation: 'Navigatsiya',
    contact: 'Aloqa',
    writeUs: 'Bizga yozing',
    leaveRequest: 'Ariza qoldirish',
    rights: '© 2026 LevelUp Academy. Barcha huquqlar himoyalangan.',
    madeIn: "O'zbekistonda yaratilgan 🇺🇿",
  },

  home: {
    badge: "O'quv markazi uchun CRM",
    h1: "O'quv markazi — to'liq nazorat ostida",
    lead: "To'lovlar, davomat, imtihonlar, motivatsiya va chatlar — bitta tizimda. Olti rol, onlayn hisoblagich va Telegram bildirishnomalari darhol ishlaydi.",
    ctaPrimary: 'Ariza qoldirish',
    ctaSecondary: "Imkoniyatlarni ko'rish",

    dash: {
      title: 'Administrator paneli',
      sub: 'Filial: Chilonzor',
      revenue: 'Oylik tushum',
      students: "O'quvchilar",
      debtors: 'Qarzdorlar',
      chart: 'Baholar taqsimoti',
    },

    band: {
      roles: 'rol bitta tizimda',
      modules: 'ishlaydigan modul',
      live: 'onlayn hisoblagich',
      telegram: 'Telegram bildirishnomalari',
    },

    featuresHead: "Markazni boshqarish uchun hamma narsa",
    featuresLead:
      "O'nlab jadval va chat o'rniga bitta mahsulot. Moliya, o'quv jarayoni va motivatsiya — rollar va huquqlar bilan yagona tizimda.",
    features: [
      {
        icon: 'coin',
        title: 'Moliya nazorat ostida',
        text: "Split-to'lovlar (naqd + karta), invoyslar va cheklar. Qarzlar va tushum real vaqtda yangilanadi.",
      },
      {
        icon: 'check',
        title: 'Davomat',
        text: "Mentor jurnali va ota-ona uchun tarix. O'quvchi kelmadi — Telegram'ga avtomatik xabar ketadi.",
      },
      {
        icon: 'clock',
        title: 'Taymerli imtihonlar',
        text: "Test konstruktori, server tomonidagi deadline va avtomatik yakunlash. Baho shaffof 0–100 shkalasi bo'yicha.",
      },
      {
        icon: 'star',
        title: 'Motivatsiya',
        text: "Baho va faollik uchun koinlar, mukofotlar do'koni, hafta va oy reytinglari. Koinlar tarixi — faqat qo'shiladi, o'chirilmaydi.",
      },
      {
        icon: 'chat',
        title: 'Realtime chatlar',
        text: "Markazning umumiy chati va ota-ona bilan administrator o'rtasidagi to'g'ridan-to'g'ri kanal. Onlayn holat va bir zumda yetkazish.",
      },
      {
        icon: 'grid',
        title: 'Hisobotlar va rollar',
        text: "Tushum, qarzlar, mentorlar maoshi. 6 rol uchun RBAC va birinchi kundan ko'p filiallilik.",
      },
    ],

    rolesHead: 'Olti rol — olti kabinet',
    rolesLead:
      "Kirgandan so'ng tizim tokendagi rolga qarab kerakli kabinetni o'zi ochadi. Ortiqcha ma'lumotni hech kim ko'rmaydi — ruxsatni serverdagi RBAC hal qiladi.",
    roles: [
      { tag: 'C', title: 'CEO', text: "Butun filiallar tarmog'i va filtrsiz umumiy hisobotlar." },
      { tag: 'A', title: 'Admin', text: "O'z filialining to'lovlari, guruhlari, o'quvchilari va hisobotlari." },
      { tag: 'M', title: 'Mentor', text: "Davomat, uy vazifasini tekshirish, koinlar, imtihonlar va o'z maoshi." },
      { tag: 'ME', title: 'Metodist', text: "Ta'lim dasturi, mavzu va darslar video bilan, testlar uchun savollar banki." },
      { tag: 'P', title: 'Ota-ona', text: "Farzandining o'zlashtirishi, davomati, qarzi va to'g'ridan-to'g'ri chat." },
      { tag: 'S', title: "O'quvchi", text: "Testlar, uy vazifalari, video, koinlar do'koni va reyting." },
    ],

    motivationBadge: 'Motivatsiya',
    motivationH2: "Ko'rinadigan motivatsiya",
    motivationLead:
      "Koinlar baho, davomat va faollik uchun beriladi — va darhol mukofotga aylanadi. Bolalar zerikib o'tirmaydi, balki musobaqalashadi.",
    motivationList: [
      "O'zlashtirish va faollik uchun koinlar",
      "Mukofotlar do'koni — koinlarni sarflash",
      "Hafta va oy reytinglari, tarix — faqat qo'shiladi",
    ],

    invoice: {
      title: 'Hisob #1042',
      sub: 'Aziza Rahimova · Frontend Pro',
      paid: "To'langan",
      totalLabel: 'Hisob summasi',
      total: "1 200 000 so'm",
      splitCaption: "Split-to'lov",
      cash: 'Naqd',
      cashValue: "700 000 so'm",
      card: 'Karta',
      cardValue: "500 000 so'm",
      resultCaption: 'Yakun',
      receipt: 'Chek',
      receiptValue: "To'lovga biriktirilgan",
      debt: "O'quvchi qarzi",
      debtValue: "0 so'm",
    },
    financeH2: "Pul nazorat ostida — bir tiyingacha",
    financeLead:
      "Bitta hisob — umumiy split_batch_id bilan bir nechta tranzaksiya. Chek to'lov bilan birga saqlanadi, qarzlar esa panelda darhol ko'rinadi.",
    financeList: [
      "Bitta to'lovda naqd + karta",
      "Har bir to'lovga chek biriktiriladi",
      'Invoys va tranzaksiyalar yagona batch bilan bog\'langan',
      "Arxiv ≠ o'chirish: faqat o'qish uchun, ma'lumot yo'qolmaydi",
    ],

    faqHead: 'Ko\'p beriladigan savollar',
    faqLead: "LevelUp Academy nima va u qanday ishlashi haqida qisqacha.",
    faq: [
      {
        q: 'LevelUp Academy nima?',
        a: "LevelUp Academy — o'quv markazlarini boshqarish uchun SaaS platforma (CRM): o'quvchilar, guruhlar, davomat, testlar va uy vazifalari, moliya (to'lovlar va split-to'lovlar), motivatsiya (koinlar, do'kon, reytinglar), chatlar va Telegram bildirishnomalari — barchasi bitta tizimda.",
      },
      {
        q: 'LevelUp Academy kimlar uchun?',
        a: "O'zbekistondagi o'quv markazlari va kurslar uchun: o'quvchilar hisobi, davomat, moliya va o'quvchilar motivatsiyasini avtomatlashtirmoqchi bo'lganlar uchun.",
      },
      {
        q: 'Narxi qancha?',
        a: "Birinchi hafta — bepul, karta va majburiyatsiz. Keyin — o'quv markazi uchun tarif bo'yicha.",
      },
      {
        q: 'Tizimda qanday rollar bor?',
        a: "Main Admin (platforma egasi), CEO (tashkilot), Admin (filial), Mentor (o'qituvchi), Student, Parent va Methodist — har bir rolning o'z kabineti va huquqlari bor.",
      },
      {
        q: 'Qanday imkoniyatlar bor?',
        a: "To'lovlar va split-to'lovlar, davomat, server taymerli testlar, uy vazifalari, koinlar va reytinglar, realtime chatlar, hisobotlar va bildirishnomalar uchun Telegram bot.",
      },
      {
        q: 'Qanday boshlash mumkin?',
        a: "Saytda ariza qoldiring — biz tashkilotingizni yaratamiz va birinchi haftani bepul ulaymiz.",
      },
    ],
  },

  features: {
    badge: 'Imkoniyatlar',
    h1: "Bitta tizim kabi ishlaydigan 12+ modul",
    lead: "LevelUp Academy jadvallar, messenjerlar va qo'lda yuritilgan jurnallar o'rnini bosadi. Hammasi bog'langan: to'lov ruxsat ochadi, kelmaslik xabar yuboradi, baho koin beradi.",
    modules: [
      {
        icon: 'coin',
        title: "To'lovlar va invoyslar",
        text: "To'liq to'lov konturi: hisob, tranzaksiyalar, naqd va karta bilan split-to'lov, bulutdagi chek. Filial tushumi bir zumda qayta hisoblanadi.",
        tags: ["Split-to'lovlar", 'Invoyslar', 'S3 dagi cheklar', 'Jonli tushum'],
      },
      {
        icon: 'calendar',
        title: 'Guruhlar va jadval',
        text: "Mentor, narx va dars jadvaliga ega guruhlar. O'quvchi guruhni tark etsa ham — tarix qoladi, hech narsa yo'qolmaydi.",
        tags: ['Dars jadvali', 'Guruh mentori', "A'zolik tarixi"],
      },
      {
        icon: 'check',
        title: 'Davomat',
        text: "Mentor guruhni bir daqiqada belgilaydi. Ota-ona davomat tarixini ko'radi, kelmaslik esa darhol bildirishnoma bo'lib uchadi — administrator qo'ng'iroq qilmaydi.",
        tags: ['Mentor jurnali', 'Ota-ona uchun tarix', 'Avto-bildirishnoma'],
      },
      {
        icon: 'clock',
        title: 'Testlar va imtihonlar',
        text: "Savollar bankiga ega test konstruktori. Taymerni brauzer emas, server ushlab turadi: deadline'dan keyin topshirish yopiladi, javoblarni soxtalashtirib bo'lmaydi.",
        tags: ['Server taymeri', 'Avto-topshirish', '0–100 shkala'],
      },
      {
        icon: 'book',
        title: 'Uy vazifalari',
        text: "Fayl, deadline va bahoga ega uy vazifalari. Fayllar to'g'ridan-to'g'ri bulutga yuklanadi — telefondan ham tez. Topshirilgan vazifa uchun o'quvchi koin oladi.",
        tags: ['Fayllar', 'Deadline', 'Topshirish uchun koin'],
      },
      {
        icon: 'star',
        title: 'Motivatsiya',
        text: "Koinlar, mukofotlar do'koni va hafta/oy reytinglari. Koinlar bilan bog'liq har bir amal jurnalga abadiy yoziladi — tarix tahrirlanmaydi.",
        tags: ['Koinlar', "Do'kon", 'Reytinglar', "Faqat qo'shiladi"],
      },
      {
        icon: 'chat',
        title: 'Realtime chatlar',
        text: "Markazning umumiy chati va ota-ona–administrator shaxsiy kanali. Xabarlar bir zumda yetkaziladi, tarix saqlanadi va skroll bilan yuklanadi.",
        tags: ['Socket.io', 'Onlayn holat', 'Tarix'],
      },
      {
        icon: 'video',
        title: 'Video darslar',
        text: "Dars yozuvlari faqat o'z guruhi o'quvchilariga ochiq. Videoga havola cheklangan vaqt yashaydi — kontent tashqariga chiqmaydi.",
        tags: ['Guruh bo\'yicha ruxsat', 'Himoyalangan havolalar'],
      },
      {
        icon: 'grid',
        title: 'Hisobotlar',
        text: "Tushum, qarzlar, mentorlar maoshi va davomat — filial yoki butun tarmoq kesimida. Raqamlar mos keladi, chunki manba bitta.",
        tags: ['Moliya', 'Maoshlar', 'Filiallar'],
      },
      {
        icon: 'send',
        title: 'Telegram bot',
        text: "Ota-ona bir martalik kod bilan akkauntini bog'laydi va muhim narsalarni oladi: to'lovlar, kelmasliklar, baholar, qarzlar. Ilova o'rnatmasdan.",
        tags: ["Kod bilan bog'lash", 'Bildirishnoma navbati'],
      },
      {
        icon: 'building',
        title: "Ko'p filiallilik",
        text: "Har bir filial izolyatsiya qilingan: admin faqat o'zinikini ko'radi. CEO esa butun tarmoqni ko'radi — filiallarni solishtiradi va o'sish nuqtalarini topadi.",
        tags: ["Ma'lumot izolyatsiyasi", 'Filiallar tarmog\'i'],
      },
    ],
    flowHead: 'LevelUp Academy bilan bir kun',
    flowLead: "Tizim har bir rolning vaqtini tejaydi — direktordan o'quvchigacha.",
    flow: [
      {
        title: 'Administratorning ertalabi',
        text: "Panelni ochdi — tushum, qarzdorlar va onlayn holat allaqachon ekranda. Qo'lda hisobot yo'q: raqamlar o'zi yig'ildi.",
      },
      {
        title: 'Mentorning kuni',
        text: "Davomatni bir daqiqada belgiladi, uy vazifasini tekshirdi, faollik uchun koin berdi. Ota-onalar xabarni allaqachon oldi — hech kimga qo'ng'iroq qilish shart emas.",
      },
      {
        title: "O'quvchining kechqurini",
        text: "Testni server deadline'igacha topshirdi, video darsni ko'rdi, koinlarni do'konda sarfladi va hafta reytingidagi o'rnini tekshirdi.",
      },
    ],
    faqHead: "Ko'p beriladigan savollar",
    faq: [
      {
        q: "Tizim IT bo'lmagan yo'nalishga to'g'ri keladimi?",
        a: "Ha. LevelUp Academy universal: ingliz tili, matematika, imtihonga tayyorgarlik — har qanday fan. Ichida dasturlashga bog'langan hech narsa yo'q.",
      },
      {
        q: 'Nechta filialni ulash mumkin?',
        a: "Cheklov yo'q. Ko'p filiallilik birinchi kundan qo'yilgan: har bir filial izolyatsiya qilingan, CEO esa butun tarmoqni ko'radi.",
      },
      {
        q: "Ota-onalarga ilova o'rnatish kerakmi?",
        a: "Yo'q. Ota-onaga Telegram yetarli: bir martalik kod bilan bog'lanadi, keyin bildirishnomalar o'zi keladi. Shaxsiy kabinet telefon brauzerida ochiladi.",
      },
      {
        q: "O'quvchi ketsa, ma'lumotlar nima bo'ladi?",
        a: "Hech narsa jismonan o'chirilmaydi. Arxiv — bu faqat o'qish rejimi: to'lovlar, baholar va koinlar tarixi hisobotlar uchun qoladi. O'quvchi qaytsa — tarixi ham qaytadi.",
      },
    ],
    ctaTitle: "Barcha modullarni jonli ko'rmoqchimisiz?",
    ctaText: 'Ariza qoldiring — tizim haqida gapirib beramiz va savollarga javob beramiz.',
  },

  roles: {
    badge: 'Rollar',
    h1: "Har kimga — o'z kabineti",
    lead: "Bitta login — va tizim kerakli interfeysni o'zi ochadi. Ruxsatni server (RBAC) hal qiladi, shuning uchun brauzer orqali «birovnikini ko'rish» imkonsiz.",
    items: [
      {
        tag: 'C',
        title: "CEO — butun tarmoq kaft ustida",
        text: "Har bir filialni va butun tarmoqni birdan ko'radi: umumiy tushum, qarzlar, onlayn hisoblagich. Filiallar, adminlar va umumiy chatni boshqaradi.",
        list: [
          'Barcha filiallar bo\'yicha filtrsiz umumiy hisobotlar',
          'Filiallarni solishtirish: tushum, qarzlar, davomat',
          "Onlayn hisoblagich — hozir nechta o'quvchi onlayn",
          'Filiallar yaratish va administratorlar tayinlash',
        ],
      },
      {
        tag: 'A',
        title: "Admin — o'z filialining xo'jayini",
        text: "Filial to'liq nazoratda: to'lovlarni qabul qiladi (split ham), guruh va o'quvchilarni yuritadi, ota-onalarga to'g'ridan-to'g'ri chatda javob beradi.",
        list: [
          "To'lovlarni qabul qilish: naqd, karta, split",
          "O'z filiali guruhlari, o'quvchilari, mentorlari — CRUD",
          "O'quvchini muzlatish — qarz o'smaydi, tarix saqlanadi",
          'Filial hisobotlari: tushum, qarzdorlar, davomat',
        ],
      },
      {
        tag: 'M',
        title: 'Mentor — kam rutina, ko\'p dars',
        text: "Davomatni bir daqiqada belgilaydi, uy vazifasi va testlarni tekshiradi, o'quvchilarga koin beradi va o'z maoshini ko'radi.",
        list: [
          "O'z guruhlari davomati — bir necha bosishda",
          'Uy vazifasi va taymerli imtihonlarni tekshirish',
          "Koinlar ± majburiy sabab bilan — hammasi jurnalda",
          "O'z maoshi va yuklamasi — shaffof",
        ],
      },
      {
        tag: 'ME',
        title: "Metodist — o'quv materiallari tartibda",
        text: "Ta'lim dasturini quradi: yo'nalishlar → mavzular → darslar, video va fayllar bilan. Testlar uchun savollar banki yig'adi va o'quvchilarga qaysi mavzular qiyinroq kelayotganini ko'radi.",
        list: [
          "Dastur: yo'nalishlar → mavzular → darslar bitta strukturada",
          "Darsga video va fayl — to'g'ridan-to'g'ri S3'ga yuklash",
          "Testlar uchun savollar banki, bir nechta darsga birdan (batch)",
          "Qiyinlik hisoboti — qaysi mavzular o'quvchilarga qiyinroq ekani ko'rinadi",
        ],
      },
      {
        tag: 'P',
        title: "Ota-ona — qo'ng'iroqsiz xotirjamlik",
        text: "Farzandining o'zlashtirishi, davomati va qarzini ko'radi. Kelmaslik, baho yoki qarz Telegram'ga o'zi keladi.",
        list: [
          "Farzandining o'zlashtirishi va davomati real vaqtda",
          "Qarz darhol ko'rinadi — kutilmagan holatlarsiz",
          "Administrator va mentor bilan to'g'ridan-to'g'ri chat",
          "Telegram bildirishnomalari: kelmaslik, to'lov, qarz",
        ],
      },
      {
        tag: 'S',
        title: "O'quvchi — qiziqtiradigan ta'lim",
        text: "Shaxsiy kabinet: testlar, uy vazifalari, video darslar. Yutuqlar uchun koinlar, mukofotlar do'koni va reytinglar — zerikish o'rniga musobaqa.",
        list: [
          'Halol server taymerli testlar',
          "To'g'ridan-to'g'ri telefondan fayl yuklab, uy vazifasini topshirish",
          "O'z guruhining video darslari",
          "Mukofotlar do'koni va hafta/oy reytinglari",
        ],
      },
    ],
    howHead: 'Ichkarida qanday ishlaydi',
    howLead: "Rol tokenga yozilgan va har bir so'rovda serverda tekshiriladi.",
    how: [
      {
        title: 'Kirish',
        text: "Telefon + parol. Server qisqa muddatli access-token beradi va uni o'zi yangilaydi — qayta chiqib-kirish shart emas.",
      },
      {
        title: "Rol bo'yicha yo'naltirish",
        text: "Tizim tokendan rolni o'qiydi va kerakli kabinetni ochadi: admin — filialni, ota-ona — farzandini, o'quvchi — o'z darslarini.",
      },
      {
        title: 'Serverdagi tekshiruv',
        text: "Har bir so'rov RBAC va filial filtridan o'tadi. Birovning manzilini bilgan taqdirda ham ochib bo'lmaydi — server rad etadi.",
      },
    ],
    ctaTitle: 'Bitta kirish — kerakli kabinet',
    ctaText: "Ariza qoldiring — rollar va huquqlar markazingizda qanday tartib o'rnatishini tushuntiramiz.",
  },

  finance: {
    badge: 'Moliya',
    h1: "Markaz puli — bir tiyingacha",
    lead: "Split-to'lovlar, invoyslar, qarz nazorati va jonli hisobotlar. Kassa uzilishi oy oxirida emas, oldindan ko'rinadi.",
    payHead: "To'lov — ota-onalarga qulay tarzda",
    payLead: "Markazlarda haqiqatda ishlatiladigan har qanday usul.",
    pay: [
      {
        icon: 'coin',
        title: "To'liq to'lov",
        text: "Bitta hisob — bitta tranzaksiya. Naqd yoki karta, chek to'lovga biriktiriladi va bulutda saqlanadi. Filial tushumi o'sha soniyada yangilanadi.",
      },
      {
        icon: 'swap',
        title: "Split-to'lov",
        text: "700 000 naqd + 500 000 karta? Muammo emas: bitta hisob, umumiy batch raqamiga ega bir nechta tranzaksiya. Qismlar summasi o'tkazishdan oldin tekshiriladi — nomuvofiqlik bo'lmaydi.",
      },
      {
        icon: 'receipt',
        title: 'Invoys va chek',
        text: "Har bir to'lov hisobga bog'langan, chek to'lov yonida bulutda saqlanadi. Yarim yildan keyin bahs chiqdimi? Hisobni ochdingiz — hammasi joyida.",
      },
    ],
    debtHead: "Qarzlar darhol ko'rinadi",
    debtLead:
      "Oy uchun to'lanmadi — o'quvchi avtomatik ravishda qarzdorlar ro'yxatiga tushadi. Administrator buni oy oxirida emas, panelda darhol ko'radi.",
    debt: [
      {
        title: "To'lov kelmadi",
        text: "O'quvchi qarzi oshdi — tizim uni hisob chiqarilgan paytda o'zi qayta hisobladi. Qo'lda hisobot yo'q.",
      },
      {
        title: 'Ota-onaga eslatma',
        text: "Ota-ona qarzni o'z kabinetida ko'radi va Telegram'ga bildirishnoma oladi. Qarzlarning aksariyati birinchi eslatmadan keyin yopiladi.",
      },
      {
        title: 'Kerak bo\'lsa — muzlatish',
        text: "O'quvchi vaqtincha kelmayaptimi? Muzlatdingiz — qarz o'smay qoldi, to'lovlar tarixi to'liq saqlandi.",
      },
    ],
    compareHead: "LevelUp Academy'gacha va keyin",
    compare: {
      task: 'Vazifa',
      before: 'Jadvallar va chatlar',
      after: 'LevelUp Academy',
      rows: [
        {
          task: "Split-to'lovni qabul qilish",
          before: "Turli jadvallarda ikki qator, yo'qotish oson",
          after: "Bitta hisob, bog'langan tranzaksiyalar",
        },
        {
          task: 'Qarzlar nazorati',
          before: "Qo'lda — daftar va xotira bo'yicha",
          after: "Qarzdorlar ro'yxati o'zi yangilanadi",
        },
        {
          task: 'Oylik tushum',
          before: 'Bir-ikki kunda, xatolar bilan yig\'iladi',
          after: 'Panelda jonli raqam',
        },
        {
          task: "Aniq o'quvchining qarzi",
          before: "«Buxgalterga qo'ng'iroq qiling»",
          after: "Ota-ona va adminga darhol ko'rinadi",
        },
        {
          task: "O'quvchi ketgandan keyingi tarix",
          before: "Qator o'chirildi — ma'lumot yo'q",
          after: "Faqat o'qish uchun arxiv: hammasi saqlanadi",
        },
      ],
    },
    safetyHead: 'Bank darajasidagi ishonchlilik',
    safetyLead: 'Tasodifan ham buzib bo\'lmaydigan qoidalar.',
    safety: [
      {
        icon: 'lock',
        title: 'Pul faqat tranzaksiyalarda',
        text: "Har bir pul amali atomar: yo to'liq o'tadi, yo umuman o'tmaydi. Yarim to'lov degan narsa yo'q.",
      },
      {
        icon: 'receipt',
        title: 'Aniq arifmetika',
        text: "«Suzuvchi» tiyinlar yo'q: summalar aniq pul formatida saqlanadi. 1 200 000 — bu roppa-rosa 1 200 000.",
      },
      {
        icon: 'shield',
        title: "Hech narsa yo'qolmaydi",
        text: "Jismoniy o'chirish yo'q: arxiv va «yumshoq» o'chirish. Har qanday to'lovni bir yildan keyin ham ko'tarish mumkin — hisobot yoki bahs uchun.",
      },
    ],
    ctaTitle: "Markaz moliyasida tartib o'rnatamizmi?",
    ctaText: "Ariza qoldiring — LevelUp Academy to'lovlar va qarzdorlarni qanday yuritishini tushuntiramiz.",
  },

  pricing: {
    badge: 'Tariflar',
    h1: 'Markazdagi tartib uchun halol narx',
    lead: "Narx tashkilotdagi barcha faol akkauntlar — o'quvchilar, ota-onalar va xodimlar soniga qarab belgilanadi. Filiallar cheksiz kiradi.",
    positioning:
      "Biz eng arzon CRM emasmiz — va bo'lishga urinmaymiz ham. Narx — bu sifat: xavfsiz to'lovlar, har kunlik zaxira nusxa va bir haftada ishga tushirish. Markazingiz ishonchliligi uchun ikki marta to'lamaysiz.",

    plansHead: "Tariflar — faol akkauntlar soniga qarab",
    plansLead:
      "Barcha faol akkauntlar hisoblanadi: o'quvchi, ota-ona, CEO, admin, mentor, metodist, filial rahbari va moliyachi.",
    free: 'Bepul',
    negotiable: 'Kelishuv asosida',
    per: "so'm/oyiga",
    popular: 'Ommabop',
    cardCta: 'Ariza qoldirish',
    plans: [
      { id: 'free', name: 'Free', amount: 0, range: "0–30 faol akkaunt" },
      { id: 'start', name: 'Start', amount: 199000, range: "31–100 faol akkaunt" },
      { id: 'standard', name: 'Standard', amount: 349000, range: "101–300 faol akkaunt", popular: true },
      { id: 'pro', name: 'Pro', amount: 599000, range: "301–600 faol akkaunt" },
      { id: 'business', name: 'Business', amount: 799000, range: "601–1000 faol akkaunt" },
      { id: 'network', name: 'Network', amount: null, range: "1000+ faol akkaunt" },
    ],
    perksHead: 'Har bir tarifga kiradi',
    perks: [
      'Filiallar cheksiz kiradi',
      "Yillik to'lov — 15% chegirma",
      "Birinchi hafta bepul, to'liq kirish",
    ],

    trialHead: 'Birinchi hafta — bepul',
    trialLead: "Hammasini jonli sinab ko'ring — xavfsiz va kartasiz.",
    trial: [
      {
        icon: 'check',
        title: "To'liq funksiya",
        text: "Barcha modullar cheklovsiz: to'lovlar, davomat, testlar, koinlar, chatlar va hisobotlar — pullik tarifdek.",
      },
      {
        icon: 'shield',
        title: 'Karta kerak emas',
        text: "Kartani biriktirish va avto-yechishlar yo'q. Hafta tugaydi — hech narsa o'zi yechilmaydi.",
      },
    ],

    guaranteeHead: 'Bizning kafolatlarimiz',
    guaranteeLead: "Xavfni o'z zimmamizga olamiz — sizga faqat natija qoladi.",
    guarantee: [
      {
        icon: 'refresh',
        title: '30 kun ichida qaytarish',
        text: "Yoqmadimi? 30 kun ichida to'lovni 100% qaytaramiz — hech qanday shartsiz.",
      },
      {
        icon: 'shield',
        title: "Ma'lumot yo'qolmaydi",
        text: "Har kuni barcha ma'lumotlaringizning zaxira nusxasi. To'lovlar, baholar va o'quvchilar tarixi xavfsiz.",
      },
      {
        icon: 'rocket',
        title: 'Bir haftada ishga tushirish',
        text: "Markazingizni 7 kunda sozlab ishga tushiramiz. Ulgurmasak — keyingi oy bepul.",
      },
    ],

    extraHead: "Markaz uchun o'z brendingizda sayt",
    extraText:
      "Markazingizga o'z firma uslubida alohida sayt va dizayn qilib beramiz — bizning platformamizda. Alohida xizmat: markaz vazifalariga qarab individual kelishiladi.",
    extraCta: 'Sayt haqida gaplashish',

    faqHead: 'Narx haqida savollar',
    faq: [
      {
        q: 'LevelUp Academy narxi qancha?',
        a: "Narx tashkilotdagi barcha faol akkauntlar soniga bog'liq: o'quvchi, ota-ona va barcha xodimlar hisoblanadi. Free (30 tagacha) — bepul, Start (31–100) — 199 000 so'm/oyiga, Standard (101–300) — 349 000, Pro (301–600) — 599 000, Business (601–1000) — 799 000. 1000 dan ortiq akkaunt — kelishuv asosida.",
      },
      {
        q: "Filiallar soni narxga ta'sir qiladimi?",
        a: "Yo'q. Filiallar har bir tarifga cheksiz kiradi. To'lov filial uchun emas, tashkilotdagi barcha faol akkauntlar soni uchun hisoblanadi.",
      },
      {
        q: 'Bepul davr bormi?',
        a: "Ha, birinchi hafta to'liq funksiya bilan va cheklovsiz bepul. Karta kerak emas, avto-yechishlar yo'q.",
      },
      {
        q: "Yillik to'lovda chegirma bormi?",
        a: "Ha, yillik to'lovda tarif summasidan 15% chegirma qo'llaniladi.",
      },
      {
        q: "Tizim to'g'ri kelmasa-chi?",
        a: "Qaytarish kafolati amal qiladi: 30 kun ichida to'lovni 100% qaytaramiz, hech qanday shartsiz.",
      },
      {
        q: "Ma'lumotlarimiz nima bo'ladi?",
        a: "Biz har kuni zaxira nusxa olamiz. To'lovlar, baholar, davomat va o'quvchilar tarixi yo'qolmaydi — arxiv yozuvlari ham hisobotlar uchun ochiq qoladi.",
      },
    ],

    ctaTitle: 'Tarifingizni hisoblashga tayyormisiz?',
    ctaText:
      "Ariza qoldiring — markazingiz hajmiga mos tarifni tanlaymiz va birinchi haftani bepul ulaymiz.",
  },

  langSchool: {
    badge: 'Til markazlari uchun',
    h1: 'Til markazi uchun CRM',
    lead: "Darajali guruhlar, davomat, uy vazifalari, to'lovlar va o'quvchilar motivatsiyasi — bitta tizimda. LevelUp Academy til markazini to'liq yuritadi: o'quvchini yozishdan tushum hisobotigacha.",
    intro:
      "Ingliz tili, IELTS/CEFR, koreys, arab, rus tili — LevelUp Academy fanga bog'liq emas. Bu til asosiy yo'nalish bo'lgan o'quv markazi uchun tizim: ichida hech qanday «dasturlash» yo'q.",
    pricingLink: "Tariflarni ko'rish",

    fitHead: 'Til markaziga moslangan',
    fitLead: "Til markazlari qo'lda qiladigan ishlar bu yerda o'zi ishlaydi.",
    fit: [
      {
        icon: 'calendar',
        title: 'Darajali guruhlar',
        text: "A1–C1, boshlang'ich va davom etuvchi, IELTS va suhbat guruhlari — har biri mentor, jadval va narxi bilan. O'quvchi yuqori darajaga o'tsa, tarixi qoladi.",
      },
      {
        icon: 'check',
        title: 'Davomat',
        text: "Mentor davomatni bir daqiqada belgilaydi. Ota-ona bola darsda bo'lganini ko'radi, kelmaslik esa darhol Telegram'ga uchadi — administrator qo'ng'iroq qilmaydi.",
      },
      {
        icon: 'book',
        title: 'Uy vazifalari',
        text: "Fayl va deadline bilan uy vazifalari: esse, speaking uchun audio, grammatika. Fayllar telefondan yuklanadi, topshirilgani uchun o'quvchi koin oladi.",
      },
      {
        icon: 'clock',
        title: 'Testlar va imtihonlar',
        text: "Server taymerli test konstruktori: lug'at, grammatika, sinov IELTS/CEFR. Deadline'dan keyin topshirish yopiladi — javoblarni soxtalashtirib bo'lmaydi.",
      },
      {
        icon: 'coin',
        title: "To'lovlar va qarzlar",
        text: "Kurs uchun yoki oylik, naqd va karta, split-to'lov. To'lanmadi — o'quvchi avtomatik qarzdorlar ro'yxatida, qarz darhol ko'rinadi.",
      },
      {
        icon: 'star',
        title: "Til o'rganishga motivatsiya",
        text: "Baho, davomat va topshirilgan vazifalar uchun koinlar, mukofotlar do'koni va reytinglar. Bolalar tilni majburan emas, qiziqish bilan o'rganadi.",
      },
    ],

    howHead: 'Yozishdan hisobotgacha',
    howLead: 'LevelUp Academy bilan til markazining bir kuni.',
    how: [
      {
        title: "O'quvchini yozdik",
        text: "Administrator o'quvchini kiritdi, daraja bo'yicha guruhga qo'shdi va kurs uchun to'lovni qabul qildi. Ota-ona kirish va Telegram bildirishnomalarini oldi.",
      },
      {
        title: 'Darslarni yuritamiz',
        text: "Mentor davomatni belgilaydi, uy vazifasi va testlar beradi, speaking'dagi faollik uchun koin qo'shadi. Ota-onalar progressni real vaqtda ko'radi.",
      },
      {
        title: "Natijani ko'ramiz",
        text: "Tushum, qarzlar va davomat — panelda. Qaysi o'quvchi kelmasliklar sabab tashlab ketish arafasida ekani kurs oxirida emas, oldindan ko'rinadi.",
      },
    ],

    faqHead: "Ko'p beriladigan savollar",
    faq: [
      {
        q: 'LevelUp Academy til maktabiga to\'g\'ri keladimi?',
        a: "Ha. Bu har qanday yo'nalishdagi o'quv markazi uchun CRM: ingliz, IELTS, koreys, arab, rus tili. Darajali guruhlar, davomat, uy vazifalari, testlar, to'lovlar va motivatsiya — barchasi til markazi vazifalariga mos. Ichida aniq fanga bog'langan narsa yo'q.",
      },
      {
        q: 'Darajali guruhlar (A1–C1, IELTS) yuritish mumkinmi?',
        a: "Ha. Har bir guruh — o'z mentori, darajasi, jadvali va narxi bilan. O'quvchi keyingi darajaga o'tsa, davomat, baho va to'lovlar tarixi saqlanadi.",
      },
      {
        q: 'Ota-onalar baho va kelmaslik haqida qanday biladi?',
        a: "Telegram orqali. Ota-ona bir martalik kod bilan akkauntini bog'laydi va bildirishnoma oladi: kelmaslik, baho, qarz. Ilova o'rnatish shart emas.",
      },
      {
        q: 'Til maktabining nechta filialini ulash mumkin?',
        a: "Cheklovsiz. Har bir filial izolyatsiya qilingan, rahbar esa butun tarmoqni ko'radi: filiallar bo'yicha tushum, davomat va qarzlarni solishtiradi.",
      },
      {
        q: 'Til maktabi uchun narxi qancha?',
        a: "Narx barcha faol akkauntlar soniga qarab hisoblanadi, filiallar cheksiz kiradi. Birinchi hafta — bepul, kartasiz. Batafsil — tariflar sahifasida.",
      },
    ],

    ctaTitle: "Til markazida tartib o'rnatamizmi?",
    ctaText:
      "Ariza qoldiring — LevelUp Academy til markazida guruhlar, to'lovlar va motivatsiyani qanday yuritishini ko'rsatamiz. Birinchi hafta bepul.",
  },

  courses: {
    badge: 'Kurslar va repetitorlar uchun',
    h1: 'Kurslar va repetitorlik markazi uchun CRM',
    lead: "Guruh va yakkama-yakka darslar, davomat, uy vazifalari, kurs uchun to'lovlar va motivatsiya — bitta tizimda. Oqim kurslariga ham, repetitorlarga ham mos.",
    intro:
      "IT va dasturlash, dizayn, imtihonga tayyorgarlik, maktab fanlari — LevelUp Academy yo'nalishga bog'liq emas. Katta oqimlarni ham, yakka repetitorlikni ham yuritadi.",
    pricingLink: "Tariflarni ko'rish",

    fitHead: 'Kurs va repetitorlikka moslangan',
    fitLead: "Administrator va repetitorning vaqtini oladigan ishlar bu yerda avtomatlashtirilgan.",
    fit: [
      {
        icon: 'calendar',
        title: 'Guruh va yakkama-yakka',
        text: "Oqim kurslari guruhlar bilan va yakkama-yakka darslar — har biri mentor, jadval va narxi bilan. O'quvchi modulni tugatsa yoki boshqa repetitorga o'tsa, tarix saqlanadi.",
      },
      {
        icon: 'check',
        title: 'Davomat',
        text: "Mentor davomatni bir daqiqada belgilaydi. Ota-ona yoki o'quvchining o'zi kelmaslikni ko'radi, bildirishnoma esa darhol Telegram'ga ketadi.",
      },
      {
        icon: 'book',
        title: 'Uy vazifalari va loyihalar',
        text: "Fayl va deadline bilan uy vazifalari va loyihalar. Fayllar telefondan yuklanadi, topshirilgani uchun o'quvchi koin oladi.",
      },
      {
        icon: 'clock',
        title: 'Testlar va imtihonlar',
        text: "Server taymerli test konstruktori: oraliq, yakuniy, sinov. Deadline'dan keyin topshirish yopiladi — javoblarni soxtalashtirib bo'lmaydi.",
      },
      {
        icon: 'coin',
        title: "Kurs uchun to'lov va qarzlar",
        text: "Kurs, modul yoki oylik uchun to'lov, naqd va karta, split-to'lov. To'lanmadi — o'quvchi avtomatik qarzdorlar ro'yxatida.",
      },
      {
        icon: 'star',
        title: "O'qishni tugatishga motivatsiya",
        text: "Baho, davomat va topshirilgan vazifalar uchun koinlar, mukofotlar do'koni va reytinglar. Kursni yarmida kamroq tashlab ketishadi.",
      },
    ],

    howHead: 'Yozishdan natijagacha',
    howLead: 'LevelUp Academy bilan kursning bir oqimi.',
    how: [
      {
        title: "Kursga yozdik",
        text: "Administrator o'quvchini guruhga yoki repetitorga kiritdi va kurs uchun to'lovni qabul qildi. O'quvchi va ota-ona kirish va Telegram bildirishnomalarini oldi.",
      },
      {
        title: 'Darslarni yuritamiz',
        text: "Mentor davomatni belgilaydi, uy vazifasi va testlar beradi, faollik uchun koin qo'shadi. Progress real vaqtda ko'rinadi.",
      },
      {
        title: "Natijani ko'ramiz",
        text: "Tushum, qarzlar va davomat — panelda. Kim kelmasliklar sabab kursni tashlab ketish xavfida ekani oldindan ko'rinadi.",
      },
    ],

    faqHead: "Ko'p beriladigan savollar",
    faq: [
      {
        q: "LevelUp Academy kurslar va repetitorlarga to'g'ri keladimi?",
        a: "Ha. Bu har qanday yo'nalishdagi o'quv markazi uchun CRM: IT-kurslar, dizayn, imtihonga tayyorgarlik, repetitorlik. Guruh va yakkama-yakka darslar, davomat, uy vazifalari, testlar, to'lovlar va motivatsiya — barchasi kurs va repetitorlik markazi vazifalariga mos.",
      },
      {
        q: 'Guruh va yakkama-yakka darslarni ham yuritish mumkinmi?',
        a: "Ha. Guruh yoki yakkama-yakka dars — har birining o'z mentori, jadvali va narxi bor. Guruh va repetitorlar o'rtasida o'tishda o'quvchi tarixi saqlanadi.",
      },
      {
        q: "Kurs yoki modullar uchun to'lovni qanday qabul qilish mumkin?",
        a: "Butun kurs, modul yoki oylik uchun — naqd, karta yoki split-to'lov. Qarzlar avtomatik hisoblanadi, qarzdorlar darhol ko'rinadi.",
      },
      {
        q: 'Nechta kurs filialini ulash mumkin?',
        a: "Cheklovsiz. Har bir filial izolyatsiya qilingan, rahbar esa butun tarmoqni ko'radi: filiallar bo'yicha tushum, davomat va qarzlar.",
      },
      {
        q: 'Kurslar uchun narxi qancha?',
        a: "Narx barcha faol akkauntlar soniga qarab hisoblanadi, filiallar cheksiz kiradi. Birinchi hafta — bepul, kartasiz. Batafsil — tariflar sahifasida.",
      },
    ],

    ctaTitle: "Kursingizda tartib o'rnatamizmi?",
    ctaText:
      "Ariza qoldiring — LevelUp Academy kurslar va repetitorlikda guruhlar, to'lovlar va motivatsiyani qanday yuritishini ko'rsatamiz. Birinchi hafta bepul.",
  },

  vsExcel: {
    badge: "Excel o'rniga CRM",
    h1: "O'quv markazi uchun Excel o'rniga CRM",
    lead: "Jadvallar o'quvchi yuztadan kam bo'lgunicha ishlaydi. Keyin — yo'qolgan qarzlar, bir-biriga mos kelmaydigan raqamlar va hisobot yig'ishga ketgan kechalar.",
    intro:
      "LevelUp Academy «jadval + daftar + chatlar» to'plamini bitta tizimga almashtiradi: to'lovlar, davomat, uy vazifalari va ota-onalarga bildirishnomalar bir joyda turadi va o'zi hisoblanadi.",
    pricingLink: "Tariflarni ko'rish",

    painHead: 'Jadvallar qayerda sinadi',
    painLead: "Excel yomon bo'lgani uchun emas — unda rollar, tarix va eslatmalar yo'q.",
    pain: [
      {
        icon: 'swap',
        title: 'Raqamlar mos kelmaydi',
        text: "Bitta o'quvchi uchta faylda: administratorda, mentorda va moliya jadvalida. Bir oydan keyin uchta har xil summa chiqadi va ularning birortasi to'g'ri emas.",
      },
      {
        icon: 'coin',
        title: "Qarzlar oy oxirida ko'rinadi",
        text: "Jadvalda qarz o'zi hisoblanmaydi — kimdir o'tirib yig'ishi kerak. Yig'ilmaguncha o'quvchi qatnayveradi, summa esa o'sib boradi.",
      },
      {
        icon: 'shield',
        title: "Qatorni o'chirdingiz — tarixni yo'qotdingiz",
        text: "O'quvchi ketdi, qatori tozalandi. U bilan birga to'lovlar, baholar va davomat ham yo'qoldi: yarim yildan keyingi bahsda isbot qoladigan narsa yo'q.",
      },
      {
        icon: 'lock',
        title: "Faylni hamma ko'radi",
        text: "Ruxsatlar yo'q: havolasi bor odam tushumni, maoshlarni va ota-onalar telefonini ko'radi. Mentor ham egasi ko'rgan narsani ko'radi.",
      },
      {
        icon: 'send',
        title: 'Ota-onaga hech kim yozmaydi',
        text: "Jadval kelmaganlik yoki qarz haqida bildirishnoma yubormaydi. Har bir eslatma — administratorning qo'l mehnati.",
      },
      {
        icon: 'clock',
        title: 'Hisobot bir kechaga tushadi',
        text: "Oylik tushum bir-ikki kun yig'iladi va baribir xato bilan chiqadi. Raqam tayyor bo'lguncha esa u eskirgan bo'ladi.",
      },
    ],

    compareHead: "Excel va LevelUp Academy — vazifalar bo'yicha",
    compare: {
      task: 'Vazifa',
      before: 'Excel va jadvallar',
      after: 'LevelUp Academy',
      rows: [
        {
          task: "O'quvchi kartochkasi",
          before: 'Fayldagi qator, dubl va xatolar',
          after: 'Tarix, guruh va holati bilan profil',
        },
        {
          task: "O'quvchi qarzi",
          before: "Qo'lda yig'iladi, oy oxirida ko'rinadi",
          after: "Hisob-faktura chiqarilganda o'zi qayta hisoblanadi",
        },
        {
          task: 'Davomat',
          before: "Mentor daftari — administrator ko'rmaydi",
          after: "Elektron jurnal, admin va ota-ona ko'radi",
        },
        {
          task: 'Ota-onaga bildirishnoma',
          before: "Administratorning qo'ng'iroqlari",
          after: 'Telegram orqali avtomatik',
        },
        {
          task: 'Kirish huquqlari',
          before: "Fayli bor odam hammasini ko'radi",
          after: 'Yettita rol, ruxsatni server hal qiladi',
        },
        {
          task: 'Tushum hisoboti',
          before: "Bir-ikki kun yig'iladi, xatolar bilan",
          after: 'Panelda jonli raqam',
        },
        {
          task: "O'quvchi ketgandan keyingi tarix",
          before: "Qator o'chirildi — ma'lumot yo'q",
          after: "Faqat o'qish uchun arxiv: hammasi saqlanadi",
        },
        {
          task: 'Telefondan ishlash',
          before: "Jadvalni telefonda tahrirlab bo'lmaydi",
          after: "Mentor, o'quvchi va ota-ona kabineti",
        },
      ],
    },

    howHead: "O'tish bir hafta oladi",
    howLead: "Butun tarixni ko'chirish shart emas — jadvallarni birinchi kuniyoq tashlash ham.",
    how: [
      {
        title: 'Tuzilmani yaratamiz',
        text: "Filiallar, guruhlar, mentorlar va narxlar — yarim soatlik ish. Faqat hozir amalda bo'lgani ko'chiriladi, uch yillik arxiv emas.",
      },
      {
        title: "O'quvchilar va qarzlarni ko'chiramiz",
        text: "Faol o'quvchilar guruhlar bo'yicha va ochiq qarzlar. Qarzlarni kiritish shart: ularsiz birinchi solishtirishning o'zi mos kelmaydi.",
      },
      {
        title: 'Bir hafta parallel yuritamiz',
        text: "Jadval sug'urta bo'lib qoladi: bir hafta tushum va qarzlarni solishtiramiz. Mos keldi — jadvallarni yopish mumkin.",
      },
    ],
    guideLink: "Excel'dan o'tish bo'yicha bosqichma-bosqich qo'llanma",

    faqHead: "Ko'p beriladigan savollar",
    faq: [
      {
        q: "O'quv markazi uchun CRM Excel'dan nimasi bilan yaxshi?",
        a: "Excel ma'lumotni saqlaydi, lekin qarzni hisoblamaydi, ruxsatlarni ajratmaydi va ota-onaga yozmaydi. CRM buni o'zi qiladi: qarz hisob-faktura chiqarilgan payt qayta hisoblanadi, davomatni administrator ham, ota-ona ham ko'radi, bildirishnomalar Telegram'ga ketadi, o'quvchi tarixi esa o'chirilgan qator bilan birga yo'qolmaydi.",
      },
      {
        q: "Excel'dan CRM'ga o'tish qancha vaqt oladi?",
        a: "Odatda bir hafta. Avval filiallar, guruhlar va mentorlar kiritiladi, keyin faol o'quvchilar va ochiq qarzlar. Bir hafta markaz jadval bilan parallel ishlaydi va tushum hamda qarzlarni solishtiradi — mos kelgandan keyin jadvallarni yopish mumkin.",
      },
      {
        q: "Excel'dan ma'lumotlarni ko'chirish mumkinmi?",
        a: "Ha. Faol o'quvchilar, guruhlar va ochiq qarzlarni ko'chirish kerak — o'tgan yillardagi butun tarixni ko'chirish shart emas, u jadvalda arxiv sifatida qoladi. Bosqichma-bosqich tartib o'tish qo'llanmasida yozilgan.",
      },
      {
        q: "O'tgandan keyin eski jadvallar bilan nima qilish kerak?",
        a: "Ularni arxiv sifatida faqat o'qish uchun qoldiring. LevelUp Academy'da ma'lumot jismonan o'chirilmaydi: o'quvchi arxivga o'tadi, uning to'lovlari, baholari va davomati to'liq saqlanadi.",
      },
      {
        q: "Excel'ni CRM'ga almashtirish qancha turadi?",
        a: "30 ta faol akkauntgacha — bepul, keyin o'quvchi, ota-ona va xodimlarning barcha faol akkauntlari hisoblanadi. Filiallar cheksiz kiradi.",
      },
    ],

    ctaTitle: 'Jadvallardan voz kechish vaqti keldimi?',
    ctaText:
      "Ariza qoldiring — markaz Excel'siz qanday ko'rinishini o'z ma'lumotlaringizda ko'rsatamiz. Birinchi hafta bepul, kartasiz.",
  },

  blog: {
    badge: 'Bilimlar bazasi',
    h1: "O'quv markazi uchun bilimlar bazasi",
    lead: "Markazning hisobi, moliyasi va davomatida qanday tartib o'rnatish — quruq gapsiz, CRM tajribasiga asoslanib. O'qing va joriy eting.",
    readMore: "O'qish",
    minutesLabel: 'daq',
    backToBlog: '← Bilimlar bazasiga',
    tocLabel: 'Chop etilgan',
    articles: {
      'excel-to-crm': {
        title: "Excel'dan o'quv markazi uchun CRM'ga qanday o'tish kerak",
        ceoTitle: "Excel'dan CRM'ga o'tish — o'quv markazi | LevelUp",
        ceoDescription:
          "O'quv markazining Excel'dan CRM'ga bosqichma-bosqich o'tishi: nimani ko'chirish (o'quvchilar, guruhlar, to'lovlar, qarzlar), hech narsani yo'qotmaslik va nimadan boshlash. Migratsiya cheklisti.",
        excerpt:
          "Jadvallar ikkinchi yuz o'quvchida buziladi. CRM'ga nimani ko'chirish, hech narsani yo'qotmaslik va nimadan boshlashni ko'rib chiqamiz.",
        date: '2026-07-16',
        reading: 6,
        body: [
          { type: 'p', text: "Excel va Google Jadvallar o'quvchilar kam bo'lguncha ishlaydi. Lekin markaz o'sishi bilan jadvallar xatolar manbaiga aylanadi: raqamlar mos kelmaydi, qarzlar yo'qoladi, o'quvchi tarixi esa o'chirilgan qator bilan birga yo'qoladi. CRM'ga qanday o'tish va hech narsani yo'qotmaslikni ko'rib chiqamiz." },
          { type: 'h2', text: 'Excel qayerda qiynay boshlaydi' },
          { type: 'ul', items: [
            "Dublikatlar va nomuvofiqlik: bir xil ma'lumot turli fayllarda farq qiladi.",
            "Qarzlar faqat qo'lda ko'rinadi — ular haqida oy oxirida bilasiz.",
            "O'quvchi qatorini o'chirdingiz — to'lov va baholar tarixini yo'qotdingiz.",
            "Kirish huquqlari yo'q: fayli bor har kim hammasini ko'radi.",
            "Ota-onalarga kelmaslik va qarz haqida avto-bildirishnoma yo'q.",
          ] },
          { type: 'h2', text: "CRM'ga birinchi navbatda nimani ko'chirish" },
          { type: 'ul', items: [
            "O'quvchilar va guruhlar (daraja, mentor va narx bilan).",
            'Mentorlar va dars jadvali.',
            "Joriy to'lovlar va, eng muhimi, ochiq qarzlar.",
            "Kamida joriy davr uchun davomat tarixi.",
          ] },
          { type: 'h2', text: "Qanday o'tish va hech narsani yo'qotmaslik" },
          { type: 'p', text: "Hammasini birdan ko'chirmang va Excel'ni birinchi kuni tashlamang. Eng xavfsiz yo'l — bir-ikki hafta parallel ishlatish: ma'lumotni CRM'ga kiritasiz va jadval bilan solishtirasiz, hammasi mos kelishiga ishonch hosil qilguncha." },
          { type: 'ul', items: [
            'Filiallar va guruhlarni yarating.',
            "Faol o'quvchilarni ko'chiring va guruhlarga taqsimlang.",
            "Ochiq qarzlarni kiriting — shunda haqiqiy manzarani darhol ko'rasiz.",
            "Ota-onalarni bir martalik Telegram-kod bilan ulang.",
            "Bir hafta Excel bilan parallel yuriting va tushum hamda qarzlarni solishtiring.",
          ] },
          { type: 'h2', text: 'Nimadan boshlash' },
          { type: 'p', text: "Bitta guruhdan boshlang: uni yarating, bir-ikki to'lov qabul qiling, davomatni belgilang — va jadvaldagi bilan solishtiring. LevelUp Academy'da birinchi hafta bepul va kartasiz, shuning uchun migratsiyani xavfsiz sinab ko'rish mumkin." },
        ],
      },
      'student-debts': {
        title: "O'quvchilar qarzida pulni qanday yo'qotmaslik kerak",
        ceoTitle: "O'quvchilar qarzida pulni yo'qotmaslik | LevelUp",
        ceoDescription:
          "O'quvchilar qarzi nega sezilmay o'sadi va uni qanday nazorat qilish: qarzdorlarning avtomatik ro'yxati, Telegram'da ota-onaga eslatma va tarixni yo'qotmasdan muzlatish.",
        excerpt:
          "O'quv markazida qarzlar jimgina yig'iladi va oy oxirida chiqadi. Ularni qanday ko'rinadigan qilish va nizosiz pulni qaytarish.",
        date: '2026-07-16',
        reading: 5,
        body: [
          { type: 'p', text: "Darslar uchun qarz kamdan-kam birdan paydo bo'ladi — u asta-sekin yig'iladi va summa allaqachon katta, ota-ona bilan suhbat esa yoqimsiz bo'lganda seziladi. Muammo ota-onalarda emas, qarz o'z vaqtida ko'rinmasligida. Buni qanday tuzatishni ko'ramiz." },
          { type: 'h2', text: "Qarzlar nega sezilmay o'sadi" },
          { type: 'ul', items: [
            "«Oylik» to'lovni unutish oson — markazga ham, ota-onaga ham.",
            "Jadvalda qarz o'zi hisoblanmaydi: kimdir raqamlarni qo'lda yig'ishi kerak.",
            "Qarz hisoblanmaguncha o'quvchi qatnayveradi — summa o'sadi.",
            "Eslatish noqulay: administrator pulni «undirishni» xohlamaydi.",
          ] },
          { type: 'h2', text: "Qarzni ko'rinadigan qiling" },
          { type: 'p', text: "Asosiy qoida: qarz oy oxirida emas, hisob chiqarilgan paytda avtomatik hisoblanishi kerak. Shunda qarzdor ro'yxatda darhol paydo bo'ladi va siz summa kichik ekan reaksiya qilasiz." },
          { type: 'ul', items: [
            "Qarzdorlar ro'yxati o'zi yangilanadi — panelda ko'rinadi.",
            "Ota-ona qarzni o'z kabinetida administratorsiz ko'radi.",
            "Qarz haqida bildirishnoma Telegram'ga avtomatik ketadi.",
          ] },
          { type: 'h2', text: 'Nizosiz pulni qaytaring' },
          { type: 'p', text: "Qarzlarning aksariyati birinchi eslatmadanoq yopiladi — agar u o'z vaqtida va shaxsiy tanbeh emas, tizimdan kelsa. Agar o'quvchi vaqtincha kelmasa, uni muzlatish mumkin: qarz o'smay qoladi, to'lovlar tarixi esa to'liq saqlanadi." },
          { type: 'h2', text: 'Xulosa' },
          { type: 'p', text: "Qarzlar — qattiqqo'llik emas, o'z vaqtidalik haqida. Markaz qarzdorni qarz paydo bo'lgan kuni ko'rsa, pul deyarli har doim qaytadi. LevelUp Academy'da bu darhol ishlaydi: birinchi haftani bepul sinab ko'ring." },
        ],
      },
      'attendance-automation': {
        title: "O'quv markazida davomatni qanday avtomatlashtirish kerak",
        ceoTitle: 'Markazda davomatni avtomatlashtirish (davomat) | LevelUp',
        ceoDescription:
          "Davomatni qog'ozda yuritishni to'xtatish: bir daqiqada elektron davomat jurnali, Telegram'da ota-onaga kelmaslik haqida avto-bildirishnoma va admin uchun hisobotlar.",
        excerpt:
          "Qog'oz davomat jurnali vaqtni o'g'irlaydi va kelmaslikdan qutqarmaydi. Davomatni elektron ko'rinishga o'tkazish va ota-onalarni o'zingiz xabardor qilish.",
        date: '2026-07-16',
        reading: 5,
        body: [
          { type: 'p', text: "Davomat — mentorning vaqtini yeydigan va qog'ozda yuritilganda natijaga deyarli ta'sir qilmaydigan rutina. Ota-ona kelmaslik haqida kech biladi, administrator esa — o'quvchi tashlab ketish arafasida bo'lgandagina. Elektron jurnal buni o'zgartiradi." },
          { type: 'h2', text: 'Qog\'oz jurnal nima bilan yomon' },
          { type: 'ul', items: [
            "Ma'lumot mentorning daftarida qoladi — administrator ko'rmaydi.",
            "Ota-ona kelmaslik haqida kechqurun biladi yoki umuman bilmaydi.",
            "Tarix yo'q: kim muntazam qoldirishini aniqlab bo'lmaydi.",
            "Davomatni to'lovlar bilan qo'lda solishtirish deyarli imkonsiz.",
          ] },
          { type: 'h2', text: 'Elektron davomat qanday ishlaydi' },
          { type: 'p', text: "Mentor guruhni to'g'ridan-to'g'ri telefondan bir daqiqada belgilaydi. Qolganini tizim qiladi: ota-ona bola darsda bo'lganini darhol ko'radi, kelmaslik esa administratorsiz Telegram'ga bildirishnoma bo'lib ketadi." },
          { type: 'ul', items: [
            "Guruhni bir necha bosishda, qog'ozsiz belgilash.",
            "Kelmaslik haqida ota-onaga o'sha zahoti avto-bildirishnoma.",
            "Davomat tarixi — kim muntazam qoldirishi ko'rinadi.",
            "Ma'lumot to'lovlar va filial hisobotlari bilan bog'langan.",
          ] },
          { type: 'h2', text: 'Bu markazga nima beradi' },
          { type: 'p', text: "Ota-onalar xotirjam, chunki xabardor. Administrator kim tashlab ketish arafasida ekanini oldindan ko'radi — va o'quvchini ushlab qolishga ulguradi. Mentor esa jurnalga o'n daqiqa emas, bir daqiqa sarflaydi. LevelUp Academy'da elektron davomatni birinchi hafta bepul sinash mumkin." },
        ],
      },
    },
  },

  gamification: {
    badge: 'Motivatsiya',
    h1: "O'quvchilar zerikib o'tirmaydi, musobaqalashadi",
    lead: "Yutuqlar uchun koinlar, mukofotlar do'koni va jonli reytinglar. Motivatsiya yig'ilishdagi quruq gap bo'lmay qoladi — uni har bir o'quvchi har kuni ko'radi.",
    earnHead: 'Koinlar qanday ishlab topiladi',
    earnLead:
      "Koinlar haqiqiy yutuqlar uchun beriladi, har bir amal esa sabab talab qiladi — «shunchaki» bo'lmaydi.",
    earnList: [
      'Test va imtihonlardagi yuqori baholar',
      "Vaqtida topshirilgan uy vazifalari",
      "Qoldirmasdan qatnashish",
      'Darsdagi faollik — mentor belgilaydi',
    ],
    spendHead: 'Koinlar qayerga sarflanadi',
    spendLead:
      "Mukofotlar do'koni — vitrinani markazning o'zi to'ldiradi: merch, sertifikatlar, bepul darslar — nima xohlasa.",
    spend: [
      {
        title: 'Markaz vitrinasi',
        text: "Administrator mukofotlar va ularning koindagi narxini joylaydi. Narx sotib olish paytida qotiriladi — keyin o'zgarmaydi.",
      },
      {
        title: "O'quvchining xaridi",
        text: "O'quvchi to'g'ridan-to'g'ri kabinetdan yig'adi va sarflaydi. Balans minusga ketmaydi — tizim bor summadan ortiqni sarflashga yo'l qo'ymaydi.",
      },
      {
        title: 'Berish va hisob',
        text: "Buyurtma administratorda paydo bo'ladi, mukofot shaxsan topshiriladi. Barcha xaridlar tarixi abadiy saqlanadi.",
      },
    ],
    journalBadge: 'Halollik',
    journalH2: "Qayta yozib bo'lmaydigan jurnal",
    journalLead:
      "Koinlarning har bir qo'shilishi va yechilishi jurnalga abadiy yoziladi: kim, kimga, qancha va nima uchun. Yozuvlar tahrirlanmaydi va o'chirilmaydi — faqat qo'shiladi.",
    journalList: [
      'Har qanday amal uchun sabab majburiy',
      "Balans va jurnal faqat birga o'zgaradi",
      'Reytinglar avtomatik qayta hisoblanadi',
      "Bahsli holat? Jurnal hammasini ko'rsatadi",
    ],
    journalTitle: 'Koinlar jurnali',
    journalRows: [
      { amount: '+50', text: 'Aziza R. — imtihon 96/100' },
      { amount: '+20', text: "Bekzod K. — uy vazifasi deadline'gacha topshirildi" },
      { amount: '−300', text: 'Dilnoza T. — xarid: markaz futbolkasi' },
      { amount: '+10', text: 'Sanjar U. — darsdagi faollik' },
    ],
    boardHead: 'Hafta va oy reytinglari',
    boardLead:
      "Reyting har hafta va har oy nolga tushadi — yangi kelgan ham quvib yetishga imkon topadi. O'tgan g'alabalar snapshotlarda saqlanadi: yutuqlar tarixi yo'qolmaydi.",
    board: [
      {
        icon: 'zap',
        title: 'Jonli reyting',
        text: "Koin oldi — reytingdagi o'rin darhol yangilandi. O'quvchilar harakatni real vaqtda ko'radi.",
      },
      {
        icon: 'refresh',
        title: 'Halol qayta boshlash',
        text: "Hafta va oy hamma uchun noldan boshlanadi. Musobaqa yetib bo'lmas lider bilan poygaga aylanmaydi.",
      },
      {
        icon: 'trophy',
        title: "G'alabalar tarixi",
        text: "Har bir davr g'oliblari qayd etiladi. Markazning faxriylar doskasi o'zi yig'iladi.",
      },
    ],
    ctaTitle: 'Markazingizda musobaqani yoqing',
    ctaText: "Koinlar, do'kon va reytinglar markazingiz qoidalariga moslanadi.",
  },

  contacts: {
    badge: 'Aloqa',
    h1: 'Markazingizni muhokama qilamizmi?',
    lead: 'Ariza qoldiring — LevelUp Academy haqida gapirib beramiz va barcha savollarga javob beramiz.',
    form: {
      name: 'Ism',
      namePlaceholder: 'Sizga qanday murojaat qilaylik',
      phone: 'Telefon',
      center: "O'quv markazi",
      centerPlaceholder: 'Markaz nomi',
      size: 'Markaz hajmi',
      sizePlaceholder: "Nechta o'quvchi",
      sizeOptions: [
        "100 tagacha o'quvchi",
        "100–500 o'quvchi",
        "500–1000 o'quvchi",
        { value: '1000+', label: "1000 dan ortiq o'quvchi" },
        'Filiallar tarmog\'i',
      ],
      message: 'Xabar',
      messagePlaceholder: 'Markazni boshqarishda nimani yaxshilamoqchisiz?',
      submit: 'Ariza yuborish',
      sending: 'Yuborilmoqda…',
      success: "Ariza qabul qilindi! Tez orada siz bilan bog'lanamiz.",
      note: "Tugmani bosish orqali siz ma'lumotlarni qayta ishlash siyosatiga rozilik bildirasiz.",
      errorRate: "Urinishlar juda ko'p — bir daqiqa kuting va qayta yuboring.",
      errorGeneric: 'Arizani yuborib bo\'lmadi. Ism va telefonni tekshirib, qayta urinib ko\'ring.',
      errorNetwork: 'Server ishlamayapti. Keyinroq urinib ko\'ring yoki bizga Telegram\'da yozing.',
    },
    info: [
      {
        icon: 'send',
        title: 'Jonli maslahat',
        text: "Markazingiz jarayonlarini tahlil qilib, LevelUp Academy qaysi vazifalarni avtomatlashtirishini ko'rsatamiz.",
      },
      {
        icon: 'rocket',
        title: 'Joriy etish rejasi',
        text: "Ma'lumotlarni ko'chirish, jamoani ulash va filiallarni ishga tushirish rejasini tayyorlaymiz.",
      },
      {
        icon: 'message',
        icon: 'shield',
        title: 'Shaxsiy hisob-kitob',
        text: "O'quvchilar va xodimlar soniga mos narxni yashirin majburiyatlarsiz hisoblaymiz.",
      },
    ],
  },

  vsModme: {
    badge: 'Taqqoslash',
    h1: 'LevelUp Academy yoki Modme',
    lead: "Ikkala tizim ham bitta vazifani hal qiladi — o'quv markazida o'quvchilar, to'lovlar va davomat hisobi. Farq narxda, tarifga nima kirishida va mobil qismning yetukligida.",
    checkedNote:
      "Modme narxlari va shartlari ularning tariflar sahifasidan olingan va 2026-yil 5-avgustda tekshirilgan. Qaror qabul qilishdan oldin ularning saytini solishtirib ko'ring — shartlar o'zgargan bo'lishi mumkin.",

    priceHead: 'Oyiga qancha turadi',
    priceLead:
      "Modme'da to'lov kamida 3 oyga amalga oshiriladi, shuning uchun taqqoslash uchun ularning narxi oyiga qayta hisoblangan.",
    priceTable: {
      param: 'Markaz hajmi',
      us: 'LevelUp Academy',
      them: 'Modme',
      rows: [
        { task: "30 tagacha o'quvchi", before: "0 so'm — bepul tarif", after: "bepul tarif yo'q" },
        { task: "100 o'quvchi", before: "199 000 so'm/oy", after: "500 000 so'm/oy (3 oyga 1 500 000)" },
        { task: "300 o'quvchi", before: "349 000 so'm/oy", after: "1 040 000 so'm/oy (3 oyga 3 120 000)" },
        { task: "600 o'quvchi", before: "599 000 so'm/oy", after: "1 560 000 so'm/oy (3 oyga 4 680 000)" },
        { task: "1000 dan ortiq o'quvchi", before: 'kelishuv asosida', after: "3 000 000 so'm/oy (3 oyga 9 000 000)" },
      ],
    },

    compareHead: 'Narxga nima kiradi',
    compare: {
      task: 'Parametr',
      before: 'LevelUp Academy',
      after: 'Modme',
      rows: [
        { task: "Eng kam to'lov muddati", before: 'bir oy', after: '3 oy' },
        { task: "Bepul sinab ko'rish", before: 'birinchi hafta, kartasiz', after: "demo versiya, 7 kungacha" },
        { task: 'Geymifikatsiya (koinlar, reytinglar)', before: 'har qanday tarifga kiradi', after: "alohida modul, oyiga 150 000 so'm" },
        { task: 'Filiallar', before: 'har qanday tarifda cheklovsiz', after: "o'quvchilar soniga bog'liq tarifga qarab" },
        { task: 'Uzoq muddatga chegirma', before: "yillik to'lovda 15%", after: "12 oylik tarifda +2 oy bonus" },
        { task: 'Pulni qaytarish', before: "30 kun, summaning 100%", after: 'shartlar ularning ofertasida' },
        { task: 'Mobil ilovalar', before: "yo'q — telefon brauzerida ishlaydi", after: "bor: o'quvchilar va o'qituvchilar uchun ilovalar" },
        { task: 'Sayt va materiallar tillari', before: "русский, o'zbekcha, English", after: "o'zbekcha, русский, English" },
      ],
    },

    themHead: "Qaysi holatda Modme'ni tanlash to'g'riroq",
    themLead: "Biz hammaga mos kelamiz deb hisoblamaymiz. Mana, ularni tanlash mantiqiy bo'lgan holatlar.",
    them: [
      {
        icon: 'grid',
        title: 'Nativ ilovalar kerak',
        text: "Modme'da o'quvchilar va o'qituvchilar uchun alohida ilovalar bor. Bizda hammasi telefon brauzerida ishlaydi — funksional jihatdan bir xil, lekin ish stolida ikonka bo'lmaydi.",
      },
      {
        icon: 'check',
        title: "Siz allaqachon Modme'dasiz va hammasi joyida",
        text: "O'tish uchun o'tish o'zini oqlamaydi. Agar tizim markaz vazifalarini yopsa va jamoa unga o'rgangan bo'lsa, tejash bir haftalik ko'chirishga arzimaydi.",
      },
      {
        icon: 'building',
        title: 'Vendor tajribasi muhim',
        text: "Modme bozorda uzoqroq ishlaydi va tanilganroq. Biz 2026-yilda tashkil etilganmiz — agar bu siz uchun tamoyilli mezon bo'lsa, buni darhol aytganimiz halolroq.",
      },
    ],

    usHead: 'Qaysi holatda biz foydaliroq',
    us: [
      {
        icon: 'coin',
        title: "30 tagacha o'quvchisi bor markaz",
        text: "Bizda bu — muddatsiz bepul tarif. Modme'da bepul tarif yo'q — boshlash uchun darhol 3 oylik to'lov kerak bo'ladi.",
      },
      {
        icon: 'receipt',
        title: "Chorak oldindan to'lashni istamasangiz",
        text: "Bizda oylik to'lov: mos kelmadi — uzaytirmaysiz. Bundan tashqari, to'lovdan keyin ham tizim mos kelmasa, 30 kun ichida summa to'liq qaytariladi.",
      },
      {
        icon: 'trophy',
        title: 'Motivatsiya darhol kerak',
        text: "Koinlar, mukofotlar do'koni va reytinglar har qanday tarifga kiradi. Modme'da geymifikatsiya — tarif ustiga oyiga 150 000 so'm turadigan alohida modul.",
      },
      {
        icon: 'building',
        title: 'Filiallar tarmog\'i',
        text: "Filiallar har qanday tarifga cheklovsiz kiradi, to'lov esa barcha faol akkauntlar soniga qarab hisoblanadi. Rahbar butun tarmoq bo'yicha tushum, qarz va davomatni ko'radi.",
      },
    ],

    faqHead: "O'tish haqida ko'p beriladigan savollar",
    faq: [
      {
        q: "300 o'quvchili markaz uchun qaysi biri arzon — LevelUp Academy yoki Modme?",
        a: "LevelUp Academy: oyiga 349 000 so'm. Modme'da bu hajm uchun Basic tarifi — 3 oyga 3 120 000 so'm, ya'ni oyiga 1 040 000 so'm. Farq taxminan uch baravar; bunda geymifikatsiya bizda tarifga kiradi, Modme'da esa bu oyiga alohida 150 000 so'm. Ma'lumotlar Modme saytidan, 2026-yil 5-avgust holatiga.",
      },
      {
        q: "Modme'dan ma'lumotlarni ko'chirish mumkinmi?",
        a: "Ha. Faol o'quvchilar, guruhlar, mentorlar va ochiq qarzlarni ko'chirish kerak — o'tgan yillar tarixini ko'chirish shart emas. Modme'dan avtomatik import bizda yo'q: ko'chirishni 7 kunlik ishga tushirish doirasida bizning jamoamiz bajaradi. Birinchi haftada markaz odatda parallel ishlaydi va tushum bilan qarzni solishtiradi.",
      },
      {
        q: 'LevelUp Academy mobil ilovasi bormi?',
        a: "Alohida ilova yo'q — tizim telefon brauzerida ochiladi va o'quvchi o'sha yerdan uy vazifasini topshiradi, testdan o'tadi va video darslarni ko'radi. Bildirishnomalar Telegram'ga keladi. Modme'da nativ ilovalar bor — agar bu tamoyilli bo'lsa, bu ular foydasiga dalil.",
      },
      {
        q: "LevelUp Academy to'lovlarga yondashuvi bilan nimasi bilan farq qiladi?",
        a: "Bitta hisobni bir nechta to'lov bilan yopish mumkin — bir qismi naqd, bir qismi karta bilan — va qolgan qarz aniq hisoblanadi. Hisob muddati o'tganda o'quvchining kabinetiga kirishi avtomatik bloklanadi, to'lovdan keyin esa qayta hisoblashni kutmasdan darhol tiklanadi.",
      },
    ],

    ctaTitle: 'Farqni markazingizda hisoblab beraylikmi?',
    ctaText:
      "Ariza qoldiring — o'quvchilaringiz soni bo'yicha narxni hisoblaymiz va tizimni sizning stsenariylaringizda ko'rsatamiz. Birinchi hafta bepul.",
  },

  vsUmai: {
    badge: 'Taqqoslash',
    h1: 'LevelUp Academy yoki Umai CRM',
    lead: "Umai CRM — savdo va marketingga urg'u bergan kuchli tizim: voronkalar, AI-bot, tarqatmalar. Biz esa o'quv qismi va narxga urg'u beramiz. Quyida — shiorlar emas, faktlar.",
    checkedNote:
      "Umai CRM narxlari va funksiyalari ularning sayti va tariflar sahifasidan olingan, 2026-yil 5-avgustda tekshirilgan. Qaror qabul qilishdan oldin ularning saytini solishtirib ko'ring.",

    priceHead: 'Oyiga qancha turadi',
    priceLead:
      "Umai CRM'da narx o'quvchilar soniga bog'liq emas — u funksiyalar to'plamiga bog'liq. Bizda aksincha: funksiyalar to'plami bitta, narx esa markaz hajmi bilan o'sadi.",
    priceTable: {
      param: 'Markaz hajmi',
      us: 'LevelUp Academy',
      them: 'Umai CRM',
      rows: [
        { task: "30 tagacha o'quvchi", before: "0 so'm — bepul tarif", after: "bepul tarif yo'q" },
        { task: "100 o'quvchi", before: "199 000 so'm/oy", after: "500 000 so'm/oydan (yillik to'lovda 416 667)" },
        { task: "300 o'quvchi", before: "349 000 so'm/oy", after: "500 000 so'm/oydan — narx o'quvchilar soniga bog'liq emas" },
        { task: "600 o'quvchi", before: "599 000 so'm/oy", after: "500 000 so'm/oydan" },
        { task: "1000 dan ortiq o'quvchi", before: 'kelishuv asosida', after: 'Enterprise tarifi — kelishuv asosida' },
      ],
    },

    compareHead: 'Narxga nima kiradi',
    compare: {
      task: 'Parametr',
      before: 'LevelUp Academy',
      after: 'Umai CRM',
      rows: [
        { task: "Bepul sinab ko'rish", before: 'birinchi hafta, kartasiz', after: '7 kun, kartasiz' },
        { task: "Narx nimaga bog'liq", before: "barcha faol akkauntlar soniga", after: "funksiyalar to'plamiga; o'quvchilar cheklanmagan" },
        { task: 'Yuqori tarif', before: "799 000 so'm/oy (601–1000 o'quvchi)", after: "2 250 000 so'm/oy — AI tarifi (yillik to'lovda)" },
        { task: 'Joriy etish va sozlash', before: 'kiradi, 7 kunda ishga tushirish', after: "bir martalik 3 750 000 so'm; 12 oylik to'lovda bepul" },
        { task: 'Ekspert ish soati', before: "qo'llab-quvvatlashga kiradi", after: "375 000 so'm" },
        { task: 'Savdo voronkalari, lidlar kanbani, AI chat-bot', before: "yo'q", after: 'bor, kengaytirilgan tariflardan boshlab' },
        { task: 'WhatsApp va Instagram tarqatmalari', before: "yo'q — bildirishnomalar Telegram'da", after: 'bor' },
        { task: 'Mobil ilovalar', before: "yo'q — telefon brauzerida ishlaydi", after: "bor: o'quvchi, o'qituvchi va administrator uchun" },
        { task: 'Pulni qaytarish', before: "30 kun, summaning 100%", after: '21 ish kunigacha, ofertasi bo\'yicha' },
      ],
    },

    themHead: "Qaysi holatda Umai CRM'ni tanlash to'g'riroq",
    themLead: "Ularning kuchli tomonlari haqiqiy — mana, ular foydasiga tanlov asosli bo'lgan holatlar.",
    them: [
      {
        icon: 'send',
        title: 'Markaz savdo bilan yashaydi',
        text: "Agar asosiy muammo hisob emas, balki arizalarni qayta ishlash bo'lsa: voronkalar, lidlar kanbani, AI-bot va WhatsApp bilan Instagram'dagi tarqatmalar. Bizda bu yo'q va yaqin rejalarda ham yo'q.",
      },
      {
        icon: 'grid',
        title: 'Nativ ilovalar kerak',
        text: "Umai CRM'da uchta ilova bor — o'quvchi, o'qituvchi va administrator uchun. Bizda hammasi telefon brauzerida.",
      },
      {
        icon: 'building',
        title: 'Juda katta markaz',
        text: "Ularda narx o'quvchilar soni bilan o'smaydi. Mingdan ortiq faol o'quvchi hajmida qat'iy tarif biznikidan foydaliroq bo'lishi mumkin.",
      },
    ],

    usHead: 'Qaysi holatda biz foydaliroq',
    us: [
      {
        icon: 'coin',
        title: "Kichik va o'rta markaz",
        text: "30 tagacha o'quvchi — bepul, 100 tagacha — oyiga 199 000 so'm. Umai CRM'ning minimal tarifi esa sizda o'nta o'quvchi bormi yoki uch yuztami, oyiga 500 000 so'mdan boshlanadi.",
      },
      {
        icon: 'rocket',
        title: "Joriy etish uchun alohida to'lashni istamasangiz",
        text: "Biz markazni 7 kunda sozlab ishga tushiramiz va bu tarifga kiradi. Umai CRM'da joriy etish — alohida 3 750 000 so'm, faqat 12 oylik to'lovda bepul.",
      },
      {
        icon: 'book',
        title: "Asosiysi — o'quv qismi",
        text: "Davomat, server taymerli testlar, uy vazifalari, video darslar, koinlar va reytinglar. Biz marketing voronkalariga emas, darsda sodir bo'ladigan narsaga sarmoya kiritamiz.",
      },
      {
        icon: 'lock',
        title: 'Filiallar izolyatsiyasi muhim',
        text: "Har bir so'rov serverda tekshiriladi va tashkilot hamda filial bo'yicha filtrlanadi: bir filial administratori sahifa manzilini bilgan holda ham boshqasining ma'lumotlarini ko'rmaydi.",
      },
    ],

    faqHead: "O'tish haqida ko'p beriladigan savollar",
    faq: [
      {
        q: "100 o'quvchili markaz uchun qaysi biri arzon — LevelUp Academy yoki Umai CRM?",
        a: "LevelUp Academy: oyiga 199 000 so'm. Umai CRM: oylik to'lovda oyiga 500 000 so'mdan (yiliga birdan to'lansa 416 667 so'm), bundan tashqari 12 oyni oldindan to'lamasangiz, joriy etish uchun 3 750 000 so'm. Ma'lumotlar Umai CRM saytidan, 2026-yil 5-avgust holatiga.",
      },
      {
        q: "LevelUp Academy'da WhatsApp va Instagram integratsiyasi bormi?",
        a: "Yo'q. Bildirishnomalar — ota-onalar va o'quvchilarga dars qoldirish, to'lov va qarz haqida — Telegram bot orqali keladi. Agar markazga WhatsApp va Instagram'dagi marketing tarqatmalari va voronkalar kerak bo'lsa, bu Umai CRM'da bor, bizda esa yo'q.",
      },
      {
        q: "Umai CRM'dan ma'lumotlarni ko'chirish mumkinmi?",
        a: "Ha. Faol o'quvchilar, guruhlar, mentorlar va ochiq qarzlarni ko'chiramiz; o'tgan yillar tarixini ko'chirish shart emas. Aynan Umai CRM'dan avtomatik import bizda yo'q — ko'chirishni 7 kunlik ishga tushirish doirasida bizning jamoamiz bajaradi.",
      },
      {
        q: "LevelUp Academy narxi o'quvchilar soni bilan o'sishi rostmi?",
        a: "Ha, va bu ongli tanlov: kichik markaz tarmoq kabi to'lamasligi kerak. 30 tagacha o'quvchi — bepul, 31–100 — 199 000, 101–300 — 349 000, 301–600 — 599 000, 601–1000 — oyiga 799 000 so'm. Filiallar esa har qanday tarifga cheklovsiz kiradi.",
      },
    ],

    ctaTitle: 'Farqni markazingizda hisoblab beraylikmi?',
    ctaText:
      "Ariza qoldiring — o'quvchilaringiz soni bo'yicha narxni hisoblaymiz va agar stsenariyingiz boshqa yechimga yaqinroq bo'lsa, buni halol aytamiz.",
  },

  faqHub: {
    badge: 'Savol va javoblar',
    h1: "LevelUp Academy haqida ko'p beriladigan savollar",
    lead: "Ulanishdan oldin so'raladigan savollarga javoblar: o'quvchilar qanday kiradi, to'lov kechikkanda nima bo'ladi, kim nimani ko'radi va markazni tizimga ko'chirish qanday kechadi.",
    intro:
      "Narxlar, Excel'dan o'tish va til markazi bilan ishlash haqidagi savollar alohida sahifalarda — havolalar quyida.",

    groups: [
      {
        title: 'Ishni boshlash',
        items: [
          {
            q: "Biror dastur o'rnatish kerakmi?",
            a: "Yo'q. LevelUp Academy brauzerda ishlaydi — kompyuterda, planshetda va telefonda. Alohida mobil ilova kerak emas: o'quvchi uy vazifasini topshiradi va video darsni to'g'ridan-to'g'ri telefon brauzeridan ko'radi.",
          },
          {
            q: 'Tizimni kim sozlaydi — bizmi yoki markazmi?',
            a: "Biz sozlaymiz. Filiallar, guruhlar, mentorlar va faol o'quvchilarni kiritamiz va markazni 7 kunda ishga tushiramiz. Muddatga ulgurmasak, keyingi oy bepul.",
          },
          {
            q: 'O\'quvchilar va ota-onalar qanday kiradi?',
            a: "O'quvchi va ota-onalarda email bo'lmaydi: administrator ularga 8 belgidan iborat login-kod va 6 raqamli parol beradi. Kodda o'xshash belgilar (0/O, 1/I) yo'q — uni telefonda xatosiz aytib berish mumkin. Xodimlar — administrator, mentor, metodist — email va parol bilan kiradi.",
          },
          {
            q: 'Telegram bildirishnomalarini qanday ulash mumkin?',
            a: "Akkaunt botga kabinetdagi bir martalik havola orqali bog'lanadi — havola bir necha daqiqa yashaydi va faqat bir marta ishlaydi. Bog'langandan so'ng dars qoldirish, to'lov va qarz haqidagi xabarlar oddiy Telegram'ga keladi, alohida ilova kerak emas.",
          },
        ],
      },
      {
        title: "To'lovlar va qarzlar",
        items: [
          {
            q: "O'quvchi o'z vaqtida to'lamasa nima bo'ladi?",
            a: "Hisob muddati o'tganda o'quvchining kabinetiga — uy vazifalari, testlar, video darslar va do'konga — kirishi avtomatik bloklanadi. To'lov o'tishi bilan, hatto qisman bo'lsa ham, kirish keyingi sahifa ochilishidayoq tiklanadi: tungi qayta hisoblashni kutish shart emas.",
          },
          {
            q: "To'lovni bo'lib va turli usulda qabul qilsa bo'ladimi?",
            a: "Ha. Bitta hisobni bir nechta to'lov bilan yopish mumkin — bir qismi kassada naqd, bir qismi karta bilan. Barcha to'lovlar bitta hisobga bog'langani uchun qolgan qarz «taxminan» emas, aniq ko'rinadi.",
          },
          {
            q: "O'quvchining qarzi qanday hisoblanadi?",
            a: "Qarz hisob chiqarilgan va to'langan paytda tizim tomonidan qayta hisoblanadi — qo'lda jamlash shart emas. Filial administratori qarzdorlar ro'yxatini va filial bo'yicha summani ko'radi, tarmoq rahbari esa barcha filiallar manzarasini birdan ko'radi.",
          },
          {
            q: "O'quvchini vaqtincha muzlatib qo'yish mumkinmi?",
            a: "Ha. Muzlatish hisoblashni to'xtatadi: o'quvchi qatnamayotgan paytda qarz o'smaydi, to'lovlar, baholar va davomat tarixi esa to'liq saqlanadi. Qaytgach, o'sha joydan davom etadi.",
          },
        ],
      },
      {
        title: "O'quv jarayoni, huquqlar va ma'lumotlar",
        items: [
          {
            q: 'Testdagi taymerni aldash mumkinmi?',
            a: "Yo'q. Test vaqtini brauzer emas, server hisoblaydi: sahifani qayta yuklash, aloqa uzilishi yoki ikkinchi oyna ochish taymerni uzaytirmaydi.",
          },
          {
            q: "Xodimlardan kim nimani ko'radi?",
            a: "Mentor faqat o'z guruhlarini, administrator faqat o'z filialini, tarmoq rahbari barcha filiallarni ko'radi. Huquqlar har bir so'rovda serverda tekshiriladi, shuning uchun sahifa manzilini bilgan holda ham begona filialni ochib bo'lmaydi.",
          },
          {
            q: "Ota-ona nimani ko'radi?",
            a: "O'z farzandining o'zlashtirishi, davomati va qarzini, shuningdek administrator va mentor bilan to'g'ridan-to'g'ri chatni. Dars qoldirish, baho va to'lov eslatmasi Telegram'ga o'zi keladi — qo'ng'iroq qilib so'rash shart emas.",
          },
          {
            q: "Vaqt o'tishi bilan markaz ma'lumotlariga nima bo'ladi?",
            a: "Ma'lumotlar jismonan o'chirilmaydi: ketgan o'quvchi «faqat o'qish» rejimidagi arxivga o'tadi, uning to'lovlari, baholari va davomati hisobotlar uchun ochiq qoladi. Bundan tashqari, har kuni zaxira nusxa olinadi.",
          },
        ],
      },
    ],

    moreHead: 'Mavzular bo\'yicha savollar — alohida sahifalarda',
    more: [
      { label: "Narxlar, tariflar va qaytarish", path: '/landing/pricing' },
      { label: "Excel'dan CRM'ga o'tish", path: '/landing/crm-vs-excel' },
      { label: 'Til markazlari uchun', path: '/landing/for-language-school' },
      { label: 'Kurs va repetitorlar uchun', path: '/landing/for-courses' },
      { label: 'Rollar va kirish huquqlari', path: '/landing/roles' },
      { label: 'Kompaniya haqida', path: '/landing/about' },
    ],

    ctaTitle: 'Savolingizni topmadingizmi?',
    ctaText: "Ariza qoldiring — sizning stsenariyingiz bo'yicha javob beramiz va tizimni jonli ko'rsatamiz.",
  },

  about: {
    badge: 'Kompaniya haqida',
    h1: "LevelUp Academy'ni kim yaratmoqda",
    lead: "LevelUp Academy — o'quv markazlari uchun dastur: o'quvchilar, to'lovlar, davomat va o'quv jarayoni shu tizimda yuritiladi. Mahsulotni olti kishilik jamoa yaratmoqda, kompaniya 2026-yilda O'zbekistonda tashkil etilgan.",
    intro:
      "Biz o'quv markazi ham, dasturlash maktabi ham emasmiz. Biz — o'quv markazlari har kuni foydalanadigan tizimni ishlab chiquvchilarmiz.",

    whyHead: "Mahsulot qaysi uchta muammo atrofida qurilgan",
    whyLead: "Bular markazlarda eng ko'p takrorlanadigan holatlar — tizim aynan shular uchun kerak.",
    why: [
      {
        icon: 'receipt',
        title: "Pul turli jadvallarda yashaydi",
        text: "To'lovlar, qarzlar va bo'lib to'lashlar turli odamlarda va turli fayllarda yozilgan. Markaz bo'yicha umumiy qarz summasi birinchi urinishda deyarli hech qachon to'g'ri chiqmaydi.",
      },
      {
        icon: 'calendar',
        title: "Davomat bir joyga yig'ilmaydi",
        text: "Davomat qog'ozda belgilanadi, oy oxirida esa o'quvchi darslarning yarmiga kelmagani ma'lum bo'ladi. Ota-onalar buni eng oxirida bilib qoladi.",
      },
      {
        icon: 'grid',
        title: "Filiallarni solishtirib bo'lmaydi",
        text: "Har bir filial hisobni o'zicha yuritadi, shuning uchun tarmoq bo'yicha umumiy manzara yo'q: tushum qayerda tushgani va qarz qayerda o'sayotgani faqat keyin ma'lum bo'ladi.",
      },
    ],

    principlesHead: 'Tizim qanday tamoyillar ustiga qurilgan',
    principlesLead: "Bular shior emas — mahsulot arxitekturasiga kiritilgan yechimlar.",
    principles: [
      {
        icon: 'lock',
        title: 'Huquqlarni server tekshiradi',
        text: "Rol tokenga yoziladi va har bir so'rovda tekshiriladi, ma'lumotlar esa tashkilot va filial bo'yicha filtrlanadi. Sahifa manzilini bilgan holda ham begona filialni ochib bo'lmaydi.",
      },
      {
        icon: 'shield',
        title: "Ma'lumot yangi funksiyalardan muhimroq",
        text: "Har kuni zaxira nusxa olinadi, o'chirish esa «yumshoq»: to'lovlar, baholar va davomat tarixi arxiv yozuvlarda ham hisobotlar uchun ochiq qoladi.",
      },
      {
        icon: 'coin',
        title: 'Har bir raqam — jurnaldagi yozuv',
        text: "To'lovlar (naqd va karta bilan bo'lib to'lash ham) va koinlar faqat sabab ko'rsatilgan holda jurnal orqali o'zgaradi. Balansni orqaga qaytib o'zgartirib bo'lmaydi.",
      },
      {
        icon: 'rocket',
        title: 'Bir haftada ishga tushirish',
        text: "Markazni tizimga 7 kunda ko'chiramiz, birinchi hafta bepul. Muddatga ulgurmasak — keyingi oy bepul.",
      },
    ],

    factsHead: 'Kompaniya kartochkasi',
    factsLead: "Qisqa ma'lumotnoma — kim bilan ish ko'rayotganini tekshirmoqchi bo'lganlar uchun.",
    facts: [
      { label: 'Nomi', value: 'LevelUp Academy (LevelUp Academy CRM)' },
      { label: 'Bu nima', value: "O'quv markazini boshqarish uchun SaaS platforma" },
      { label: 'Tashkil etilgan', value: '2026-yil' },
      { label: 'Jamoa', value: '6 kishi' },
      { label: 'Asoschisi', value: 'Azizbek Amangeldiev' },
      { label: 'Mamlakat', value: "O'zbekiston" },
      { label: 'Tillar', value: "русский, o'zbekcha, English" },
      {
        label: 'Kimlar uchun',
        value: "O'quv markazlari, til markazlari, kurslar va repetitorlik markazlari",
      },
      { label: 'Sayt', value: 'levelup-academy.uz' },
      { label: 'Pochta', value: 'info@levelup-academy.uz' },
      { label: 'Telegram', value: '@levelupacademycrm' },
      { label: 'Instagram', value: '@levelup_academy_uz' },
      { label: 'Asoschining LinkedIn’i', value: 'linkedin.com/in/azizbek-amangeldiev-6045a342b' },
    ],

    sameHead: "Bizni ko'pincha boshqalar bilan adashtirishadi",
    sameText:
      "LevelUp Academy nomi AQSH, Serbiya, Singapur, Moldova va Tojikistondagi tashkilotlarda ham bor — maktablar, kurslar va IT-akademiyalar. Bizning ularga aloqamiz yo'q: levelup-academy.uz'dagi LevelUp Academy — O'zbekiston o'quv markazlari uchun CRM tizimi, ya'ni dastur, o'qitiladigan joy emas.",

    linksHead: "Keyin nimani ko'rish mumkin",
    links: [
      { label: 'Asoschisi — Azizbek Amangeldiev', path: '/landing/team/azizbek-amangeldiev' },
      { label: 'Tizim imkoniyatlari', path: '/landing/features' },
      { label: 'Tariflar va narxlar', path: '/landing/pricing' },
      { label: 'Rollar va huquqlar', path: '/landing/roles' },
      { label: 'Aloqa va ariza', path: '/landing/contacts' },
    ],

    ctaTitle: "Tizimni ichidan ko'rmoqchimisiz?",
    ctaText:
      "Ariza qoldiring — LevelUp Academy'ni markazingiz stsenariysida ko'rsatamiz va birinchi haftani bepul ulaymiz.",
  },

  founder: {
    badge: 'Asoschisi',
    h1: 'Azizbek Amangeldiev',
    subName: 'Азизбек Амангелдиев',
    location: "Toshkent, O'zbekiston",
    lead: "LevelUp Academy'ning asoschisi — O'zbekiston o'quv markazlari uchun SaaS CRM. Mahsulot va backend bilan shug'ullanadi: tizim arxitekturasi, autentifikatsiya, to'lovlar va ko'p filiallilik.",
    tags: ['Full-stack', 'Product', 'SaaS'],
    contactsHead: "Men bilan qanday bog'lanish mumkin",
    contactsLead: "Eng tez Telegram'da javob beraman — odatda kun davomida.",
    contactTelegramLabel: 'Telegram',
    contactTelegramNote: 'Eng tezkor',
    contactEmailLabel: 'Email',
    contactLinkedinLabel: 'LinkedIn',
    stackHead: 'Mahsulot nimada qurilgan',
    stackLead: "LevelUp Academy'ning haqiqiy texnologik steki — serverdan deploygacha.",
    stackGroups: [
      { label: 'Backend', icon: 'lock', items: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'BullMQ', 'Socket.io'] },
      { label: 'Frontend', icon: 'grid', items: ['React 18', 'Vite', 'Tailwind CSS', 'DaisyUI', 'TanStack Query', 'Redux Toolkit'] },
      { label: 'Infratuzilma', icon: 'building', items: ['Render', 'Vercel', 'MinIO / S3', 'Telegram Bot (grammY)'] },
    ],
    highlights: [
      {
        icon: 'rocket',
        title: 'Mahsulot va backend',
        text: "Tizim arxitekturasi, autentifikatsiya, to'lovlar va ko'p filiallilik — g'oyadan prodakshengacha.",
      },
      {
        icon: 'calendar',
        title: '2026-yildan beri',
        text: "LevelUp Academy'ni O'zbekistonda asos soldi — hozir mahsulotni olti kishilik jamoa ishlatadi.",
      },
      {
        icon: 'building',
        title: "Toshkent, O'zbekiston",
        text: "O'quv markazlari uchun SaaS quradi — har kuni foydalaniladigan tizim.",
      },
    ],
    bioHead: 'Azizbek Amangeldiev kim',
    bioText:
      "Azizbek Amangeldiev (Азизбек Амангелдиев) — 2026-yilda tashkil etilgan LevelUp Academy'ning asoschisi, O'zbekiston o'quv markazlari uchun SaaS-platforma. Mahsulot va backend uchun javobgar: tizim arxitekturasi, autentifikatsiya, to'lovlar va ko'p filiallilik. Toshkentda yashaydi va ishlaydi.",
    linksHead: "Keyin nimani ko'rish mumkin",
    links: [
      { label: 'Kompaniya haqida', path: '/landing/about' },
      { label: 'Tizim imkoniyatlari', path: '/landing/features' },
    ],
  },

  notFound: {
    badge: '404',
    h1: "Bunday sahifa yo'q",
    text: "Ehtimol havola eskirgan yoki manzilda xatolik bor. Bosh sahifaga qayting — u yerdan LevelUp Academy'ning barcha bo'limlari ochiladi.",
    button: 'Bosh sahifaga',
  },

  ceo: {
    home: {
      title: "O'quv markazi uchun CRM — o'quvchilar hisobi | LevelUp",
      description:
        "O'quvchilar hisobi dasturi: to'lovlar va qarzlar, davomat va elektron jurnal, testlar, motivatsiya, Telegram bildirishnomalari bitta CRM'da. Birinchi hafta bepul.",
    },
    features: {
      title: 'Imkoniyatlar — 12+ CRM moduli | LevelUp Academy',
      description:
        "To'lovlar, davomat, server taymerli testlar, uy vazifalari, koinlar, realtime chatlar, video darslar, hisobotlar va Telegram bot — LevelUp Academy'ning barcha modullari.",
    },
    roles: {
      title: 'Rollar va ruxsatlar — 6 kabinet | LevelUp Academy',
      description:
        "CEO, Admin, Mentor, Metodist, Ota-ona va O'quvchi — har bir rolning o'z kabineti. Ruxsatni serverdagi RBAC hal qiladi: ortiqchasini hech kim ko'rmaydi.",
    },
    finance: {
      title: "O'quvchilar to'lovi va qarzlar hisobi | LevelUp Academy",
      description:
        "O'quvchilar to'lovi va qarzlari hisobi: naqd va karta split-to'lovlar, invoyslar, bulutdagi cheklar va jonli tushum hisobotlari. Markaz moliyasi — bir tiyingacha.",
    },
    pricing: {
      title: "Tariflar va narxlar — o'quv markazi uchun CRM | LevelUp",
      description:
        "LevelUp Academy narxlari: 30 o'quvchigacha bepul, keyin 199 000 so'm/oyidan. Narx o'quvchilar soniga qarab, filiallar cheksiz kiradi, birinchi hafta bepul.",
    },
    langSchool: {
      title: "Til markazi uchun CRM — guruhlar, to'lovlar | LevelUp",
      description:
        "Til markazi uchun CRM: darajali guruhlar (A1–C1, IELTS), davomat, uy vazifalari, testlar, to'lovlar va motivatsiya bitta tizimda. Birinchi hafta bepul.",
    },
    courses: {
      title: "Kurslar va repetitorlar uchun CRM | LevelUp Academy",
      description:
        "Kurslar va repetitorlik markazi uchun CRM: guruh va yakkama-yakka darslar, davomat, uy vazifalari, testlar, kurs uchun to'lovlar va motivatsiya. Birinchi hafta bepul.",
    },
    vsExcel: {
      title: "Excel o'rniga CRM — o'quv markazi uchun | LevelUp",
      description:
        "O'quv markazlari nega Excel'dan CRM'ga o'tadi: qarzlar o'zi hisoblanadi, davomat va to'lovlar bitta tizimda, ota-onalar bildirishnoma oladi. O'tish bir haftada.",
    },
    blog: {
      title: "O'quv markazi uchun bilimlar bazasi | LevelUp Academy",
      description:
        "O'quv markazida tartib o'rnatish haqida maqolalar: Excel'dan CRM'ga o'tish, o'quvchilar qarzini nazorat qilish va davomatni avtomatlashtirish.",
    },
    gamification: {
      title: 'Motivatsiya va geymifikatsiya | LevelUp Academy',
      description:
        "O'zlashtirish uchun koinlar, mukofotlar do'koni va hafta hamda oyning jonli reytinglari. Koinlar jurnali faqat to'ldiriladi — har kuni ko'rinadigan motivatsiya.",
    },
    contacts: {
      title: 'Aloqa va ariza | LevelUp Academy',
      description:
        'Ariza qoldiring — LevelUp Academy haqida gapirib beramiz va savollarga javob beramiz. Birinchi hafta bepul, karta va majburiyatsiz.',
    },
    vsModme: {
      title: 'LevelUp Academy yoki Modme — narx va funksiyalar taqqoslovi',
      description:
        "LevelUp Academy va Modme'ning halol taqqoslovi: o'quvchilar soni bo'yicha narxlar, eng kam to'lov muddati, tarifdagi geymifikatsiya va mobil ilovalar. Ma'lumotlar 05.08.2026 holatiga.",
    },
    vsUmai: {
      title: 'LevelUp Academy yoki Umai CRM — narx va funksiyalar taqqoslovi',
      description:
        "LevelUp Academy va Umai CRM'ning halol taqqoslovi: narx nimaga bog'liq, joriy etish qiymati, savdo voronkalari va mobil ilovalar. Ma'lumotlar 05.08.2026 holatiga.",
    },
    faqHub: {
      title: "Savol va javoblar — o'quv markazi uchun CRM | LevelUp",
      description:
        "LevelUp Academy haqida savollar: o'quvchining login-kod bilan kirishi, to'lov kechikkanda bloklash, bo'lib to'lash, o'quvchini muzlatish, kirish huquqlari va ma'lumotlar saqlanishi.",
    },
    about: {
      title: "Kompaniya haqida — LevelUp Academy CRM ishlab chiquvchisi",
      description:
        "LevelUp Academy — O'zbekistondagi o'quv markazlari uchun CRM: kompaniya 2026-yilda tashkil etilgan, jamoa 6 kishi. Biz kimmiz, tizim qanday ishlaydi va biz nima emasmiz.",
    },
    founder: {
      title: 'Azizbek Amangeldiev — LevelUp Academy asoschisi',
      description:
        "Azizbek Amangeldiev (Азизбек Амангелдиев) — 2026-yilda asos solingan LevelUp Academy'ning asoschisi, O'zbekiston o'quv markazlari uchun SaaS CRM.",
    },
    notFound: {
      title: "Sahifa topilmadi — LevelUp Academy",
      description: "Bunday sahifa yo'q. LevelUp Academy bosh sahifasiga qayting.",
    },
    breadcrumbHome: 'Bosh sahifa',
  },
};
