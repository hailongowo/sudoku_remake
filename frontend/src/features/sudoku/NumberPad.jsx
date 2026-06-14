export function NumberPad({ onNumber, disabled = false }) {
  return (
    <div className="grid grid-cols-9 gap-1.5">
      {Array.from({ length: 9 }, (_, index) => (
        <button key={index + 1} type="button" disabled={disabled} className="btn btn-secondary px-0 py-3 text-lg" onClick={() => onNumber(index + 1)}>
          {index + 1}
        </button>
      ))}
    </div>
  );
}
