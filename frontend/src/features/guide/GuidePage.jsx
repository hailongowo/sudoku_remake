export function GuidePage() {
  return (
    <main className="page py-10">
      <article className="card mx-auto max-w-3xl p-7">
        <p className="eyebrow">Guide</p>
        <h1 className="mt-2 text-3xl font-black">How to play Sudoku</h1>
        <div className="mt-6 space-y-6 leading-7 text-slate-600">
          <section>
            <h2 className="text-xl font-black text-ink">Goal</h2>
            <p>Fill every empty cell with a number from 1 to 9. Each row, column, and 3x3 box must contain each number exactly once.</p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">Controls</h2>
            <p>Select a cell, then use the keyboard or on-screen numpad. Use Draft mode to write small candidate notes instead of final answers.</p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">Casual mode</h2>
            <p>Casual games are disposable. Hints, mistakes, notes, and the timer stay on your device. Starting a new puzzle simply replaces the current one.</p>
          </section>
          <section>
            <h2 className="text-xl font-black text-ink">Rated mode</h2>
            <p>Rated games are checked by the backend. Correct answers are saved permanently, wrong answers count as mistakes, and abandoning records a rated loss.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
