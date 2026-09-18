import { SlidersHorizontal } from "lucide-react";
import { PersonTile } from "../components/PersonTile";
import type { Person } from "../types";

export function Nearby({
  people,
  onOpen,
  onFilters,
}: {
  people: Person[];
  onOpen: (id: string) => void;
  onFilters: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto bg-ink-950 px-3 pb-24 pt-4">
      <header className="mb-3 flex items-center justify-between px-1">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-mint-400">
            Nearby
          </p>
          <h1 className="font-display text-3xl leading-none">Findr</h1>
        </div>
        <button
          type="button"
          aria-label="Filters"
          onClick={onFilters}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-ink-800"
        >
          <SlidersHorizontal size={18} />
        </button>
      </header>

      {people.length === 0 ? (
        <div className="mt-16 px-4 text-center text-white/55">
          Nobody matches these filters. Loosen them and try again.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {people.map((person) => (
            <PersonTile
              key={person.id}
              person={person}
              onOpen={() => onOpen(person.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
