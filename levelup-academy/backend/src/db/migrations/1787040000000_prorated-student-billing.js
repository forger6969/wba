export const up = (pgm) => {
  pgm.createTable('student_payment_accounts', {
    student_id: { type: 'uuid', primaryKey: true, references: 'users(id)', onDelete: 'CASCADE' },
    balance: { type: 'numeric(14,2)', notNull: true, default: 0, check: 'balance >= 0' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addColumns('invoices', {
    payment_date: { type: 'date' },
    monthly_price: { type: 'numeric(14,2)' },
    lessons_in_month: { type: 'integer' },
    billable_lessons: { type: 'integer' },
    calculation_start: { type: 'date' },
  });
};

export const down = (pgm) => {
  pgm.dropColumns('invoices', [
    'payment_date', 'monthly_price', 'lessons_in_month', 'billable_lessons', 'calculation_start',
  ]);
  pgm.dropTable('student_payment_accounts');
};
