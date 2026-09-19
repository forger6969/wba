export async function up(pgm) {
  pgm.addColumns('groups', {
    parent_tg_chat_id: { type: 'bigint' },
    parent_tg_bound_at: { type: 'timestamptz' },
    parent_tg_title: { type: 'text' },
  });
  pgm.addConstraint('groups', 'groups_parent_tg_chat_id_unique', { unique: ['parent_tg_chat_id'] });
}

export async function down(pgm) {
  pgm.dropConstraint('groups', 'groups_parent_tg_chat_id_unique');
  pgm.dropColumns('groups', ['parent_tg_chat_id', 'parent_tg_bound_at', 'parent_tg_title']);
}
