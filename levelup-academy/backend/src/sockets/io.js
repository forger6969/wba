/**
 * Реестр Socket.io-инстанса.
 *
 * `initSockets()` вызывается в server.js и возвращает io локально — из сервисов
 * (HTTP-хендлеров) до него не дотянуться. Живые события при этом нужны именно
 * оттуда: ментор проставил davomat обычным POST → админ должен увидеть это
 * сразу, без перезагрузки.
 *
 * Отсюда — маленький модуль-реестр вместо прокидывания io через все слои.
 * `emitTo` намеренно не бросает, если io ещё не поднят: очереди/краны (см.
 * WORKER-MERGE — раньше отдельный worker.js, теперь тот же процесс, что и
 * server.js) стартуют раньше initSockets в тестах/скриптах без HTTP-сервера,
 * и падать из-за отсутствия live-канала бизнес-операция не должна.
 */
let io = null;

export function setIO(instance) {
  io = instance;
}

export function getIO() {
  return io;
}

/** Отправить событие в комнату. No-op, если сокет-сервер не инициализирован. */
export function emitTo(room, event, payload) {
  if (!io) return false;
  io.to(room).emit(event, payload);
  return true;
}

/** Tell connected Main Admin dashboards that server data changed. */
export function emitMainDashboardChanged(payload = {}) {
  return emitTo('main-admins', 'main:dashboard:changed', {
    at: new Date().toISOString(),
    ...payload,
  });
}
