import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert } from "../../shared/ui/Alert";
import { useAuth } from "./AuthProvider";
import { authConfigured } from "./supabaseClient";

export function LoginPage() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || "/rated";

  if (user) return <Navigate to={destination} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const { data, error } = mode === "login" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);

    if (error) {
      setMessage({ tone: "error", text: error.message });
      return;
    }

    if (mode === "signup" && !data.session) {
      setMessage({ tone: "success", text: "Account created. Check your email if confirmation is enabled." });
      return;
    }

    navigate(destination, { replace: true });
  }

  return (
    <main className="page grid min-h-[70vh] place-items-center py-10">
      <section className="card w-full max-w-md p-6">
        <p className="eyebrow">{mode === "login" ? "Welcome back" : "Create account"}</p>
        <h1 className="mt-2 text-3xl font-black">{mode === "login" ? "Login" : "Sign up"}</h1>
        <p className="mt-2 text-sm text-slate-600">Login is required for rated games and profile editing.</p>
        {!authConfigured ? (
          <div className="mt-5">
            <Alert tone="error">Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env` first.</Alert>
          </div>
        ) : null}
        {message ? (
          <div className="mt-5">
            <Alert tone={message.tone}>{message.text}</Alert>
          </div>
        ) : null}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-bold">
            Email
            <input className="input mt-1" type="email" value={email} required onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block text-sm font-bold">
            Password
            <input className="input mt-1" type="password" minLength="6" value={password} required onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button type="submit" disabled={busy || !authConfigured} className="btn btn-primary w-full">
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
        <button type="button" className="mt-5 w-full text-sm font-bold text-brand" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
        </button>
      </section>
    </main>
  );
}
