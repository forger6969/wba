const PALETTE = [
  ['#DCFCE7', '#166534'], ['#E0F2FE', '#075985'], ['#FEF9C3', '#854D0E'],
  ['#FCE7F3', '#9D174D'], ['#EDE9FE', '#5B21B6'], ['#FFEDD5', '#9A3412'],
  ['#E6F4D7', '#3F6212'], ['#E0E7FF', '#3730A3'],
];

export default function Avatar({ name = '?', size = 36 }) {
  const letter = (name.trim()[0] || '?').toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % PALETTE.length;
  const [bg, fg] = PALETTE[h];
  return (
    <span
      style={{ width: size, height: size, background: bg, color: fg }}
      className="inline-flex items-center justify-center rounded-full font-bold shrink-0"
    >
      <span style={{ fontSize: size * 0.42 }}>{letter}</span>
    </span>
  );
}
