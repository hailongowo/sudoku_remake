import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="page py-12">
      <section className="card grid gap-8 p-8 md:grid-cols-[1.3fr_.7fr] md:p-10">
        <div>
          <p className="eyebrow">Sudoku</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">A simple place to play Sudoku.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Practice casually, play rated games when you want a challenge, and check the leaderboard when you want to compare progress.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/play" className="btn btn-primary">Play casual</Link>
            <Link to="/rated" className="btn btn-secondary">Play rated</Link>
            <Link to="/guide" className="btn btn-secondary">See guide</Link>
            <Link to="/leaderboard" className="btn btn-secondary">Leaderboard</Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 self-center">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="grid aspect-square place-items-center rounded-xl border border-slate-200 bg-slate-50 text-2xl font-black text-brand">
              {index + 1}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
