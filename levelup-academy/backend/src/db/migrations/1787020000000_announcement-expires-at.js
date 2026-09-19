export const up = (pgm) => {
  pgm.addColumn('org_announcements', { expires_at: { type: 'timestamptz' } });
  pgm.createIndex('org_announcements', ['organization_id', 'expires_at'], { name: 'idx_org_announcements_expires' });
};

export const down = (pgm) => {
  pgm.dropIndex('org_announcements', ['organization_id', 'expires_at'], { name: 'idx_org_announcements_expires' });
  pgm.dropColumn('org_announcements', 'expires_at');
};
