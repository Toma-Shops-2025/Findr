import { Chip } from "../components/Chip";
import { genderLabel, orientationLabel } from "../lib/match";
import type { Me } from "../types";

export function MeScreen({ me, onEdit }: { me: Me; onEdit: () => void }) {
  return (
    <div className="h-full overflow-y-auto bg-ink-950 px-5 pb-24 pt-8">
      <p className="text-[11px] uppercase tracking-[0.22em] text-mint-400">You</p>
      <h1 className="font-display text-4xl">
        {me.name}, {me.age}
      </h1>
      <p className="mt-2 text-white/60">{me.bio || "Add a bio so people know you."}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip active>
          {me.gender === "woman" ? "Woman" : me.gender === "man" ? "Man" : "Nonbinary"}
        </Chip>
        <Chip active>{orientationLabel[me.orientation]}</Chip>
        <Chip active>{me.intent}</Chip>
      </div>

      <p className="mt-6 text-sm text-white/50">
        Looking for {me.lookingFor.map((g) => genderLabel[g].toLowerCase()).join(", ")}
      </p>

      <button
        type="button"
        onClick={onEdit}
        className="mt-8 w-full rounded-2xl border border-white/15 py-3 font-medium"
      >
        Edit profile
      </button>

      <div className="mt-10 rounded-2xl border border-white/10 bg-ink-800 p-4 text-sm text-white/55">
        This first build runs on your device with nearby demo people. Next we
        can add real accounts, live location, photos, and push chat.
      </div>
    </div>
  );
}
