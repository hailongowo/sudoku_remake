import { NumberPad } from "./NumberPad";

export function GameControls({ onNumber, onErase, onHint, onReset, draftMode, onToggleDraft, disabled = false, hintDisabled = false, resetLabel = "Reset" }) {
  return (
    <div className="space-y-4">
      <NumberPad onNumber={onNumber} disabled={disabled} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={onErase}>
          Erase
        </button>
        <button type="button" className={`btn ${draftMode ? "btn-primary" : "btn-secondary"}`} disabled={disabled} onClick={onToggleDraft}>
          Draft
        </button>
        <button type="button" className="btn btn-secondary" disabled={disabled || hintDisabled} onClick={onHint}>
          Hint
        </button>
        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={onReset}>
          {resetLabel}
        </button>
      </div>
    </div>
  );
}
