export function EmptyState({ title, text, action }) {
  return (
    <section className="card p-8 text-center">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-slate-600">{text}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
