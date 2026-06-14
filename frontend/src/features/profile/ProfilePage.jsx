import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiRequest } from "../../shared/api/client";
import { Alert } from "../../shared/ui/Alert";
import { Loading } from "../../shared/ui/Loading";
import { useAuth } from "../auth/AuthProvider";

const displayNamePattern = /^[A-Za-z0-9 _-]{3,24}$/;

export function ProfilePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [success, setSuccess] = useState(null);
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: ({ signal }) => apiRequest("/players/me", { token, signal }),
  });

  useEffect(() => {
    if (profile.data) setDisplayName(profile.data.display_name);
  }, [profile.data]);

  const updateProfile = useMutation({
    mutationFn: () => apiRequest("/players/me", { method: "PATCH", token, body: { display_name: displayName.trim() } }),
    onSuccess: () => {
      setSuccess("Display name updated.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  if (profile.isLoading) return <Loading label="Loading profile" />;
  if (profile.isError) return <main className="page py-8"><Alert tone="error">{profile.error.message}</Alert></main>;

  const validationError = displayName && !displayNamePattern.test(displayName.trim())
    ? "Use 3-24 letters, numbers, spaces, underscores, or hyphens."
    : null;
  const p = profile.data;
  const stats = [
    ["Rating", p.rating],
    ["Rank", `#${p.rating_rank}`],
    ["Rated games", p.rated_games],
    ["Wins", p.rated_wins],
    ["Losses", p.rated_losses],
    ["Peak rating", p.peak_rating],
  ];

  return (
    <main className="page py-8">
      <p className="eyebrow">Profile</p>
      <h1 className="mt-1 text-3xl font-black">{p.display_name}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-6">
          <h2 className="text-xl font-black">Edit profile</h2>
          <form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); setSuccess(null); updateProfile.mutate(); }}>
            <label className="block text-sm font-bold">
              Display name
              <input className="input mt-1" value={displayName} minLength="3" maxLength="24" onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            {validationError ? <Alert tone="error">{validationError}</Alert> : null}
            {updateProfile.isError ? <Alert tone="error">{updateProfile.error.message}</Alert> : null}
            {success ? <Alert tone="success">{success}</Alert> : null}
            <button type="submit" className="btn btn-primary w-full" disabled={Boolean(validationError) || !displayName.trim() || displayName.trim() === p.display_name || updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save display name"}
            </button>
          </form>
        </section>
        <section className="card p-6">
          <h2 className="text-xl font-black">Stats</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
                <div className="mt-1 text-2xl font-black">{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
