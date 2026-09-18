import { Chip } from "../components/Chip";

export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-ink-950 px-6 pb-10 pt-16">
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-mint-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-24 h-72 w-72 rounded-full bg-flare-500/20 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-8 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-mint-400">
            <span className="h-2.5 w-2.5 rounded-full bg-flare-500" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Findr</span>
        </div>

        <h1 className="font-display text-5xl leading-[1.05] tracking-tight">
          People nearby.
          <br />
          Right now.
        </h1>
        <p className="mt-4 max-w-sm text-white/65">
          A location-based dating app for straight people, gay people, and
          everyone in between. 18+ only.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          <Chip>Dates</Chip>
          <Chip>Friends</Chip>
          <Chip>Right now</Chip>
        </div>

        <div className="mt-auto space-y-3 pt-16">
          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <input
              id="age"
              type="checkbox"
              className="mt-0.5 accent-[#3dffc8]"
              required
            />
            <span>
              I confirm I am 18 or older and I will only use Findr to meet
              other adults.
            </span>
          </label>
          <button
            type="button"
            onClick={() => {
              const box = document.getElementById("age") as HTMLInputElement;
              if (!box?.checked) {
                box?.focus();
                return;
              }
              onStart();
            }}
            className="w-full rounded-2xl bg-mint-400 py-3.5 text-center text-base font-semibold text-ink-950 shadow-glow"
          >
            Create my profile
          </button>
          <p className="text-center text-xs text-white/40">
            Original product. Not affiliated with any other dating app.
          </p>
        </div>
      </div>
    </div>
  );
}
