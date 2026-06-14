import { formatRatingChange, formatTime } from "../../shared/utils/format";

export function GameStats({ difficulty, puzzleRating, time, mistakes, hints, ratingBefore, ratingAfter, ratingChange }) {
  const items = [
    ["Difficulty", difficulty || "-"],
    ["Puzzle", puzzleRating ?? "-"],
    ["Time", formatTime(time)],
    ["Mistakes", mistakes ?? 0],
    ["Hints", hints ?? 0],
  ];

  if (ratingBefore != null) items.push(["Before", ratingBefore]);
  if (ratingAfter != null) items.push(["After", ratingAfter]);
  if (ratingChange != null) items.push(["Change", formatRatingChange(ratingChange)]);

  return (
    <div className="card grid grid-cols-2 gap-px overflow-hidden bg-slate-200 sm:grid-cols-4 lg:grid-cols-8">
      {items.map(([label, value]) => (
        <div key={label} className="bg-white p-3 text-center">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</div>
          <div className="mt-1 font-black">{value}</div>
        </div>
      ))}
    </div>
  );
}
