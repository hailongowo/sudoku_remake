import { Link } from "react-router-dom";


export function AdminDashboard() {
  return (
    <main className="page py-8">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-1 text-3xl font-black">Admin dashboard</h1>
      <p className="mt-2 text-slate-600">Manage users and rated-play access.</p>
      <section className="card mt-6 p-6">
        <h2 className="text-xl font-black">User management</h2>
        <p className="mt-2 text-sm text-slate-600">Search users, edit display names, suspend rated play, or reactivate accounts.</p>
        <Link to="/admin/users" className="btn btn-primary mt-5">
          Open user management
        </Link>
      </section>
    </main>
  );
}
