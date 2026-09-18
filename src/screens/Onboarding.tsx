import { Chip } from "../components/Chip";
import { genderLabel, orientationLabel } from "../lib/match";
import type { Gender, Intent, Me, Orientation } from "../types";

const genders: Gender[] = ["woman", "man", "nonbinary"];
const orientations: Orientation[] = [
  "straight",
  "gay",
  "lesbian",
  "bisexual",
  "pansexual",
  "queer",
];
const intents: Intent[] = ["dates", "friends", "right now", "open"];

export function Onboarding({
  me,
  onChange,
  onDone,
}: {
  me: Me;
  onChange: (patch: Partial<Me>) => void;
  onDone: () => void;
}) {
  const ready = me.name.trim().length > 1 && me.age >= 18 && me.lookingFor.length > 0;

  return (
    <div className="h-full overflow-y-auto bg-ink-950 px-5 pb-10 pt-12">
      <p className="text-xs uppercase tracking-[0.2em] text-mint-400">Step 1 of 1</p>
      <h1 className="mt-2 font-display text-4xl">Who are you?</h1>
      <p className="mt-2 text-sm text-white/55">
        Findr shows people near you who match what you want.
      </p>

      <label className="mt-8 block text-sm text-white/70">
        Display name
        <input
          value={me.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="First name"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-white outline-none focus:border-mint-400"
        />
      </label>

      <label className="mt-5 block text-sm text-white/70">
        Age
        <input
          type="number"
          min={18}
          max={99}
          value={me.age}
          onChange={(e) => onChange({ age: Number(e.target.value) || 18 })}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-white outline-none focus:border-mint-400"
        />
      </label>

      <p className="mt-6 mb-2 text-sm text-white/70">I am</p>
      <div className="flex flex-wrap gap-2">
        {genders.map((g) => (
          <Chip
            key={g}
            active={me.gender === g}
            onClick={() => onChange({ gender: g })}
          >
            {g === "woman" ? "A woman" : g === "man" ? "A man" : "Nonbinary"}
          </Chip>
        ))}
      </div>

      <p className="mt-6 mb-2 text-sm text-white/70">Orientation</p>
      <div className="flex flex-wrap gap-2">
        {orientations.map((o) => (
          <Chip
            key={o}
            active={me.orientation === o}
            onClick={() => onChange({ orientation: o })}
          >
            {orientationLabel[o]}
          </Chip>
        ))}
      </div>

      <p className="mt-6 mb-2 text-sm text-white/70">Looking for</p>
      <div className="flex flex-wrap gap-2">
        {genders.map((g) => {
          const on = me.lookingFor.includes(g);
          return (
            <Chip
              key={g}
              active={on}
              onClick={() =>
                onChange({
                  lookingFor: on
                    ? me.lookingFor.filter((x) => x !== g)
                    : [...me.lookingFor, g],
                })
              }
            >
              {genderLabel[g]}
            </Chip>
          );
        })}
      </div>

      <p className="mt-6 mb-2 text-sm text-white/70">Here for</p>
      <div className="flex flex-wrap gap-2">
        {intents.map((intent) => (
          <Chip
            key={intent}
            active={me.intent === intent}
            onClick={() => onChange({ intent })}
          >
            {intent}
          </Chip>
        ))}
      </div>

      <label className="mt-6 block text-sm text-white/70">
        Bio
        <textarea
          value={me.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          rows={3}
          placeholder="A line or two about you"
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-white outline-none focus:border-mint-400"
        />
      </label>

      <button
        type="button"
        disabled={!ready}
        onClick={onDone}
        className="mt-8 w-full rounded-2xl bg-mint-400 py-3.5 font-semibold text-ink-950 disabled:opacity-40"
      >
        See who's nearby
      </button>
    </div>
  );
}
