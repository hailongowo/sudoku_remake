import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "../../shared/api/client";
import { Alert } from "../../shared/ui/Alert";
import { Loading } from "../../shared/ui/Loading";

const PAGE_SIZE = 50;

export function LeaderboardPage() {
  const [page, setPage] = useState(0);
  const leaderboard = useQuery({
    queryKey: ["leaderboard", page],
    queryFn: ({ signal }) => apiRequest(`/leaderboard/rating?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, { signal }),
  });

  return (
    <main className="page py-8">
      <p className="eyebrow">Ratings</p>
      <h1 className="mt-1 text-3xl font-black">Leaderboard</h1>
      <p className="mt-2 text-slate-600">Current player ratings from rated games.</p>
      <section className="mt-6">
        {leaderboard.isLoading ? <Loading label="Loading leaderboard" /> : null}
        {leaderboard.isError ? <Alert tone="error">{leaderboard.error.message}</Alert> : null}
        {leaderboard.data ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Player</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Games</th>
                    <th className="p-4">Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.data.map((entry) => (
                    <tr key={`${entry.rank}-${entry.display_name}`} className="border-t border-slate-100">
                      <td className="p-4 font-black">#{entry.rank}</td>
                      <td className="p-4 font-bold">{entry.display_name}</td>
                      <td className="p-4 font-black text-brand">{entry.rating}</td>
                      <td className="p-4">{entry.rated_games}</td>
                      <td className="p-4">{entry.rated_wins}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
          Previous
        </button>
        <button type="button" className="btn btn-secondary" disabled={!leaderboard.data || leaderboard.data.length < PAGE_SIZE} onClick={() => setPage((current) => current + 1)}>
          Next
        </button>
      </div>
    </main>
  );
}
