const paths = {
  coin: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6 9.5h.01M18 14.5h.01" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16 9.3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.2 1.9" />
    </>
  ),
  star: (
    <path d="M12 3.2l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.4-4.2 6-.9L12 3.2z" />
  ),
  chat: (
    <path d="M4 4.5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9.5L4.7 20v-3.5H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1z" />
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  book: (
    <>
      <path d="M4 5A2.5 2.5 0 0 1 6.5 2.5H20V19H6.5A2.5 2.5 0 0 0 4 21.5V5z" />
      <path d="M4 19A2.5 2.5 0 0 1 6.5 16.5H20" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.4" />
      <path d="M10 9.2l6 2.8-6 2.8V9.2z" fill="currentColor" stroke="none" />
    </>
  ),
  send: (
    <>
      <path d="M21.5 2.5 10.8 13.2" />
      <path d="M21.5 2.5 14.8 21.5l-4-8.3-8.3-4 19-6.7z" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.4" />
      <path d="M9 7.5h.01M15 7.5h.01M9 12h.01M15 12h.01M9 16.5h.01M15 16.5h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.3a4 4 0 0 1 8 0V11" />
    </>
  ),
  swap: <path d="M6.5 7h11.5l-3-3M17.5 17H6l3 3" />,
  receipt: (
    <>
      <path d="M6 2h12v20l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4V2z" />
      <path d="M9 7.5h6M9 11.5h6M9 15.5h3" />
    </>
  ),
  shield: <path d="M12 2.5 4.5 5.3v5.9c0 5 3.3 8.4 7.5 10.3 4.2-1.9 7.5-5.3 7.5-10.3V5.3L12 2.5z" />,
  zap: <path d="M13 2 4.2 14h6L9 22l9.8-13h-6.2L13 2z" />,
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 1-15.3 6.4M3 12a9 9 0 0 1 15.3-6.4" />
      <path d="M21 3v6h-6M3 21v-6h6" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v4.2a4 4 0 0 1-8 0V4z" />
      <path d="M8 4.5H5.3A2.8 2.8 0 0 0 8 8.8M16 4.5h2.7A2.8 2.8 0 0 1 16 8.8" />
      <path d="M12 12.2V15M9 20h6M10 17h4v3h-4z" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 2.5c3 2 5 6 5 9.5 0 2-1 3.8-2 4.8l-3 3-3-3c-1-1-2-2.8-2-4.8 0-3.5 2-7.5 5-9.5z" />
      <circle cx="12" cy="10.5" r="1.6" />
      <path d="M8.3 16.3 5.5 19M15.7 16.3l2.8 2.7" />
    </>
  ),
  message: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.3a2.8 2.8 0 0 1 5.2 1.4c0 1.7-2.3 1.9-2.3 3.6" />
      <path d="M12 17.2h.01" />
    </>
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.2" />
      <path d="M3.5 6.7l8.5 6.3 8.5-6.3" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 10.3V17M8 7.3h.01" />
      <path d="M12 17v-4.3a2.2 2.2 0 0 1 4.3 0V17M12 12.7V17" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5S19 15 19 10a7 7 0 0 0-14 0c0 5 7 11.5 7 11.5z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
};

export default function Icon({ name, size = 20 }) {
  const content = paths[name];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
