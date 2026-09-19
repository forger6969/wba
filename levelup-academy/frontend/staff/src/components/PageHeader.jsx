export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6 animate-page-enter">
      <div>
        <h1 className="text-[20px] font-extrabold tracking-tight leading-tight text-base-content">{title}</h1>
        {subtitle && (
          <p className="text-[12px] text-base-content/70 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
