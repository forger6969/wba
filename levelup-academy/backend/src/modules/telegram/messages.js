const RU = {
  startHelp:
    'Здравствуйте! Чтобы привязать Telegram, нажмите "Привязать Telegram" в кабинете CRM и откройте полученную ссылку.',
  tokenInvalid:
    'Код привязки недействителен или истек. Получите новый код в кабинете CRM.',
  bindSuccess: 'Telegram успешно привязан. Теперь вы будете получать уведомления здесь.',
  alreadyLinkedUser: 'Этот аккаунт CRM уже привязан к Telegram.',
  alreadyLinkedChat: 'Этот Telegram-чат уже привязан к другому аккаунту CRM.',
  stopSuccess: 'Telegram отвязан. Уведомления больше не будут приходить в этот чат.',
  stopMissing: 'Этот чат не был привязан к CRM.',
  genericError: 'Не удалось выполнить действие. Попробуйте позже или получите новый код в кабинете CRM.',
  loginSuccess: 'Вход подтверждён. Вернитесь на вкладку с сайтом — она откроется сама.',
  loginExpired: 'Ссылка для входа истекла. Нажмите «Войти через Telegram» на сайте ещё раз.',
  onlyForStudents: 'Эта команда только для учеников. Данные о ребёнке — в кабинете.',
  dataError: 'Не удалось получить данные. Попробуйте чуть позже.',
  helpText: [
    'Что я умею:',
    '',
    '/home — коины, рейтинг, долг и ближайшие задания',
    '/coins — баланс коинов',
    '/rating — недельный рейтинг',
    '/stop — отвязать Telegram',
  ].join('\n'),
  // Вход не создаёт привязку намеренно: иначе любой, кто открыл ссылку входа,
  // привязал бы к себе чужой чат. Привязка — только из кабинета, где человек
  // уже доказал, что знает логин и пароль.
  loginNotLinked:
    'Этот Telegram не привязан ни к одному аккаунту. Войдите на сайте по логину и паролю, затем нажмите «Telegram» в кабинете.',
  branchBindNotGroup: 'Эту команду нужно отправить в самой группе родителей, а не в личном чате с ботом.',
  branchBindTokenInvalid: 'Код недействителен или истёк. Получите новый код в кабинете Branch Manager.',
  branchBindSuccess: 'Группа привязана к филиалу. Сюда будут приходить уведомления о посещаемости и успеваемости.',
  branchBindAlreadyLinked: 'Эта группа уже привязана к другому филиалу.',
};

const UZ = {
  startHelp:
    'Assalomu alaykum! Telegramni ulash uchun CRM kabinetida "Telegramni ulash" tugmasini bosing va berilgan havolani oching.',
  tokenInvalid: 'Ulash kodi yaroqsiz yoki muddati tugagan. CRM kabinetidan yangi kod oling.',
  bindSuccess: 'Telegram muvaffaqiyatli ulandi. Endi xabarlar shu yerga keladi.',
  alreadyLinkedUser: 'Bu CRM akkaunt allaqachon Telegramga ulangan.',
  alreadyLinkedChat: 'Bu Telegram chat boshqa CRM akkauntga ulangan.',
  stopSuccess: 'Telegram uzildi. Bu chatga xabarlar boshqa kelmaydi.',
  stopMissing: 'Bu chat CRMga ulanmagan.',
  genericError: 'Amalni bajarib bo‘lmadi. Keyinroq urinib ko‘ring yoki CRM kabinetidan yangi kod oling.',
  loginSuccess: 'Kirish tasdiqlandi. Sayt ochilgan oynaga qayting — u o‘zi ochiladi.',
  loginExpired: 'Kirish havolasining muddati tugagan. Saytda «Telegram orqali kirish» tugmasini yana bosing.',
  loginNotLinked:
    'Bu Telegram hech qaysi akkauntga ulanmagan. Avval saytga login va parol bilan kiring, so‘ng kabinetda «Telegram» tugmasini bosing.',
  onlyForStudents:
    'Bu buyruq faqat o‘quvchilar uchun. Farzandingiz haqidagi ma’lumotlar kabinetda.',
  dataError: 'Ma’lumotni olib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring.',
  branchBindNotGroup: 'Bu buyruqni botga shaxsiy emas, aynan ota-onalar guruhiga yuborish kerak.',
  branchBindTokenInvalid: 'Kod yaroqsiz yoki muddati tugagan. Branch Manager kabinetidan yangi kod oling.',
  branchBindSuccess: 'Guruh filialga ulandi. Bu yerga davomat va o‘zlashtirish haqida xabarlar keladi.',
  branchBindAlreadyLinked: 'Bu guruh allaqachon boshqa filialga ulangan.',
  helpText: [
    'Nima qila olaman:',
    '',
    '/home — coin, reyting, qarz va yaqin vazifalar',
    '/coins — coin balansi',
    '/rating — haftalik reyting',
    '/stop — ulashni uzish',
  ].join('\n'),
};

export function messages(language = 'ru') {
  return language === 'uz' ? UZ : RU;
}
