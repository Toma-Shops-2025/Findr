import { ArrowLeft, MessageCircle } from "lucide-react";
import { genderLabel, orientationLabel } from "../lib/match";
import type { Person } from "../types";

export function PersonProfile({
  person,
  onBack,
  onMessage,
}: {
  person: Person;
  onBack: () => void;
  onMessage: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto bg-ink-950 pb-10">
      <div className="relative">
        <img
          src={person.photo}
          alt={person.name}
          className="h-[58vh] w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-black/30" />
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/45 backdrop-blur"
        >
          <ArrowLeft size={18} />
        </button>
        {person.online && (
          <span className="absolute right-4 top-4 rounded-full bg-mint-400/90 px-2.5 py-1 text-xs font-semibold text-ink-950">
            Online
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <h1 className="font-display text-4xl">
            {person.name}, {person.age}
          </h1>
          <p className="mt-1 text-sm text-white/70">
            {person.distanceMi < 1
              ? `${Math.round(person.distanceMi * 5280)} feet away`
              : `${person.distanceMi.toFixed(1)} miles away`}{" "}
            · {person.lastActive}
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 pt-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1 capitalize">
            {person.gender}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">
            {orientationLabel[person.orientation]}
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 capitalize">
            {person.intent}
          </span>
        </div>
        <p className="text-[15px] leading-relaxed text-white/80">{person.bio}</p>
        <p className="text-sm text-white/50">
          Looking for {person.lookingFor.map((g) => genderLabel[g].toLowerCase()).join(", ")}
        </p>
        <button
          type="button"
          onClick={onMessage}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-mint-400 py-3.5 font-semibold text-ink-950"
        >
          <MessageCircle size={18} />
          Message {person.name}
        </button>
      </div>
    </div>
  );
}
