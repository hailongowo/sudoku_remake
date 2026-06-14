export function Alert({ children, tone = "info" }) {
  const className = {
    info: "border-blue-200 bg-blue-50 text-blue-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];

  return (
    <div role="alert" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${className}`}>
      {children}
    </div>
  );
}
