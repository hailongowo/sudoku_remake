import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="page grid min-h-[60vh] place-items-center py-12 text-center">
      <section>
        <p className="eyebrow">404</p>
        <h1 className="mt-2 text-3xl font-black">Page not found</h1>
        <Link to="/" className="btn btn-primary mt-6">Go home</Link>
      </section>
    </main>
  );
}
