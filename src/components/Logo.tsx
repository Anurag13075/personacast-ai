export function Logo({ size = 36, withText = true, dark = false }: { size?: number; withText?: boolean; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="hevaGrad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#hevaGrad)" />
        <path d="M12 10v20M28 10v20M12 20h16M22 10l-4 20" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      {withText && (
        <span className={`text-xl font-semibold tracking-tight ${dark ? "text-white" : "text-ink"}`}>Heva AI</span>
      )}
    </div>
  );
}
