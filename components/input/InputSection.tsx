type InputSectionProps = {
  hypothesis: string;
  onHypothesisChange: (value: string) => void;
  onGenerate: () => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  loadingMessage?: string;
  errorMessage?: string | null;
};

export function InputSection({
  hypothesis,
  onHypothesisChange,
  onGenerate,
  disabled = false,
  isLoading = false,
  loadingMessage,
  errorMessage,
}: InputSectionProps) {
  const busy = isLoading;
  const effectiveDisabled = disabled || busy;

  return (
    <section
      className={`rounded-xl border border-[#d6d2c1] bg-[#fffdf6] p-4 shadow-sm sm:p-6 ${
        effectiveDisabled && !busy ? "opacity-60" : ""
      }`}
    >
      <label
        htmlFor="hypothesis"
        className="mb-2 block text-sm font-semibold text-[#4b5242]"
      >
        Hypothesis Input
      </label>
      <textarea
        id="hypothesis"
        value={hypothesis}
        disabled={effectiveDisabled}
        onChange={(event) => onHypothesisChange(event.target.value)}
        className="min-h-32 w-full resize-none rounded-lg border border-[#d8d4c5] bg-[#fffef9] px-4 py-3 text-sm text-[#4f5648] outline-none ring-[#b8b39f] transition placeholder:text-[#9b9786] focus:ring-2 disabled:cursor-not-allowed"
        placeholder="Enter your scientific hypothesis..."
      />

      {busy && loadingMessage ? (
        <p className="mt-3 text-sm text-[#6a715f]" aria-live="polite">
          {loadingMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p
          className="mt-3 rounded-lg border border-[#e6c8bf] bg-[#fff1ee] px-3 py-2 text-sm text-[#9c4736]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            void onGenerate();
          }}
          disabled={effectiveDisabled}
          className="w-full rounded-lg bg-[#7f8572] px-4 py-2.5 text-sm font-medium text-[#f8f7f1] transition enabled:hover:bg-[#707761] disabled:cursor-not-allowed disabled:bg-[#bdb9a8] sm:w-auto sm:py-2"
        >
          {busy ? "Working…" : "Generate Experiment Plan"}
        </button>
      </div>
    </section>
  );
}
