export const up = (pgm) => {
  pgm.addColumn('org_announcements', {
    branch_id: { type: 'uuid', references: 'branches(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('org_announcements', ['organization_id', 'branch_id', 'created_at'], { name: 'idx_org_announcements_scope' });
};

export const down = (pgm) => {
  pgm.dropIndex('org_announcements', ['organization_id', 'branch_id', 'created_at'], { name: 'idx_org_announcements_scope' });
  pgm.dropColumn('org_announcements', 'branch_id');
};
