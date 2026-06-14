export function ConfirmModal({ title, children, confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false, onConfirm, onCancel, busy = false }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
      <section role="dialog" aria-modal="true" className="card w-full max-w-md p-6">
        <h2 className="text-xl font-black">{title}</h2>
        <div className="mt-3 text-sm leading-6 text-slate-600">{children}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} disabled={busy} onClick={onConfirm}>
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
