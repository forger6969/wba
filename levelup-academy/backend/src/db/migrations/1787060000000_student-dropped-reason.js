/**
 * Karis 20.08.2026: Admin уже собирал причину архивации в форме (StudentDetail.jsx
 * "Archive Modal" → actionReason → api.adminDeleteStudent(..., reason)), но backend
 * получал её и молча выбрасывал — deleteStudent()/softDeleteStudent() не принимали
 * reason вообще, только deleted_at + status='dropped'. Колонка зеркалит существующий
 * frozen_reason (та же student_profiles, тот же принцип — необязательный текст).
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE student_profiles ADD COLUMN dropped_reason TEXT;`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE student_profiles DROP COLUMN IF EXISTS dropped_reason;`);
};
