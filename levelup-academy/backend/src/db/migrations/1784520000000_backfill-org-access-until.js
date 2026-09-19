/**
 * КРИТИЧНО: сразу после добавления organizations.access_until (миграция
 * org-feature-flags) у ВСЕХ существующих организаций это поле NULL, а
 * isOrgAccessBlocked() трактует NULL как "ни разу не платил" → блокирует
 * ВЕСЬ доступ (login всех ролей). Без этого бэкофилла каждый уже работающий
 * партнёр оказался бы залочен в тот же момент, когда фича доедет до прода —
 * поймано тестами (auth-suite: "Organization access suspended" на ровном
 * месте) ДО деплоя, не после.
 *
 * Даём каждой уже активной/триальной организации месяц форы — Main Admin
 * успевает пройтись и зафиксировать реальные оплаты/бонусы по каждому
 * партнёру, никого не выключает внезапно. Замороженные (status='frozen')
 * не трогаем — они и так заблокированы независимым от access_until
 * оверрайдом, им access_until не нужен.
 */
export const up = (pgm) => {
  pgm.sql(`
    UPDATE organizations
       SET access_until = CURRENT_DATE + INTERVAL '1 month'
     WHERE status IN ('active', 'trial') AND access_until IS NULL;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    UPDATE organizations SET access_until = NULL WHERE status IN ('active', 'trial');
  `);
};
