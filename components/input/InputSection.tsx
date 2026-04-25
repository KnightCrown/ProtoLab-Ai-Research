type InputSectionProps = {
  hypothesis: string;
  onHypothesisChange: (value: string) => void;
  onGenerate: () => void;
  disabled?: boolean;
};

export function InputSection({
  hypothesis,
  onHypothesisChange,
  onGenerate,
  disabled = false,
}: InputSectionProps) {
  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <label
        htmlFor="hypothesis"
        className="mb-2 block text-sm font-semibold text-gray-900"
      >
        Hypothesis Input
      </label>
      <textarea
        id="hypothesis"
        value={hypothesis}
        disabled={disabled}
        onChange={(event) => onHypothesisChange(event.target.value)}
        className="min-h-32 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none ring-gray-300 transition placeholder:text-gray-400 focus:ring-2 disabled:cursor-not-allowed"
        placeholder="Enter your scientific hypothesis..."
      />
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Generate Experiment Plan
        </button>
      </div>
    </section>
  );
}
