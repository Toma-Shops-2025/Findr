import { ArrowLeft } from "lucide-react";
import { Chip } from "../components/Chip";
import { genderLabel, orientationLabel } from "../lib/match";
import type { Filters, Gender, Intent, Orientation } from "../types";

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

function toggle<T>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function FiltersScreen({
  filters,
  onChange,
  onBack,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onBack: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto bg-ink-950 px-5 pb-10 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm text-white/70"
      >
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="font-display text-4xl">Filters</h1>
      <p className="mt-2 text-sm text-white/50">
        Narrow the grid. Mutual match means they want your gender too.
      </p>

      <label className="mt-8 flex items-center justify-between rounded-2xl bg-ink-800 px-4 py-3">
        <span>Mutual matches only</span>
        <input
          type="checkbox"
          checked={filters.mutualOnly}
          onChange={(e) =>
            onChange({ ...filters, mutualOnly: e.target.checked })
          }
          className="accent-[#3dffc8]"
        />
      </label>
      <label className="mt-3 flex items-center justify-between rounded-2xl bg-ink-800 px-4 py-3">
        <span>Online now</span>
        <input
          type="checkbox"
          checked={filters.onlineOnly}
          onChange={(e) =>
            onChange({ ...filters, onlineOnly: e.target.checked })
          }
          className="accent-[#3dffc8]"
        />
      </label>

      <p className="mt-7 mb-2 text-sm text-white/70">Gender</p>
      <div className="flex flex-wrap gap-2">
        {genders.map((g) => (
          <Chip
            key={g}
            active={filters.genders.includes(g)}
            onClick={() =>
              onChange({ ...filters, genders: toggle(filters.genders, g) })
            }
          >
            {genderLabel[g]}
          </Chip>
        ))}
      </div>

      <p className="mt-6 mb-2 text-sm text-white/70">Orientation</p>
      <div className="flex flex-wrap gap-2">
        {orientations.map((o) => (
          <Chip
            key={o}
            active={filters.orientations.includes(o)}
            onClick={() =>
              onChange({
                ...filters,
                orientations: toggle(filters.orientations, o),
              })
            }
          >
            {orientationLabel[o]}
          </Chip>
        ))}
      </div>

      <p className="mt-6 mb-2 text-sm text-white/70">Here for</p>
      <div className="flex flex-wrap gap-2">
        {intents.map((intent) => (
          <Chip
            key={intent}
            active={filters.intents.includes(intent)}
            onClick={() =>
              onChange({ ...filters, intents: toggle(filters.intents, intent) })
            }
          >
            {intent}
          </Chip>
        ))}
      </div>

      <label className="mt-7 block text-sm text-white/70">
        Max distance · {filters.maxDistance} mi
        <input
          type="range"
          min={1}
          max={25}
          value={filters.maxDistance}
          onChange={(e) =>
            onChange({ ...filters, maxDistance: Number(e.target.value) })
          }
          className="mt-3 w-full accent-[#3dffc8]"
        />
      </label>
      <label className="mt-5 block text-sm text-white/70">
        Age {filters.minAge}–{filters.maxAge}
        <input
          type="range"
          min={18}
          max={99}
          value={filters.maxAge}
          onChange={(e) =>
            onChange({
              ...filters,
              maxAge: Math.max(filters.minAge, Number(e.target.value)),
            })
          }
          className="mt-3 w-full accent-[#3dffc8]"
        />
      </label>
    </div>
  );
}
