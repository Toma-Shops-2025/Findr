import type { Person } from "../types";

export function PersonTile({
  person,
  onOpen,
}: {
  person: Person;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink-700 text-left"
    >
      <img
        src={person.photo}
        alt={person.name}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
      {person.online && (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-mint-400 shadow-[0_0_10px_#3dffc8]" />
      )}
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <p className="truncate text-sm font-semibold tracking-tight">
          {person.name}, {person.age}
        </p>
        <p className="text-[11px] text-white/70">
          {person.distanceMi < 1
            ? `${Math.round(person.distanceMi * 5280)} ft`
            : `${person.distanceMi.toFixed(1)} mi`}
        </p>
      </div>
    </button>
  );
}
