export function Loading({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm font-semibold text-slate-500">
      {label}...
    </div>
  );
}
