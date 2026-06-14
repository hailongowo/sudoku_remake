const difficulties = ["Easy", "Medium", "Hard", "Expert", "Master"];

export function DifficultySelect({ value, onChange }) {
  return (
    <select className="input w-auto" value={value} onChange={(event) => onChange(event.target.value)}>
      {difficulties.map((difficulty) => (
        <option key={difficulty} value={difficulty}>
          {difficulty}
        </option>
      ))}
    </select>
  );
}
