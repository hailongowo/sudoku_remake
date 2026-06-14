import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

const navItems = [
  ["Home", "/"],
  ["Casual", "/play"],
  ["Rated", "/rated"],
  ["Leaderboard", "/leaderboard"],
  ["Guide", "/guide"],
];

export function Layout({ children }) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="page flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-xl font-black">
            Sudoku
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {navItems.map(([label, href]) => (
              <NavLink
                key={href}
                to={href}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 font-bold ${isActive ? "bg-blue-50 text-brand" : "text-slate-600 hover:text-ink"}`
                }
              >
                {label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/profile" className={({ isActive }) => `rounded-lg px-3 py-2 font-bold ${isActive ? "bg-blue-50 text-brand" : "text-slate-600"}`}>
                  Profile
                </NavLink>
                <button type="button" className="btn btn-secondary py-2 text-sm" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <Link className="btn btn-primary py-2 text-sm" to="/login">
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-16 border-t border-slate-200 bg-white">
        <div className="page py-6 text-sm text-slate-500">Simple Sudoku, casual and rated.</div>
      </footer>
    </div>
  );
}
