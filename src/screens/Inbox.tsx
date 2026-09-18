import type { Person, Thread } from "../types";

export function Inbox({
  threads,
  people,
  onOpen,
}: {
  threads: Thread[];
  people: Person[];
  onOpen: (id: string) => void;
}) {
  const rows = threads
    .map((thread) => ({
      thread,
      person: people.find((p) => p.id === thread.personId),
    }))
    .filter((row) => row.person);

  return (
    <div className="h-full overflow-y-auto bg-ink-950 px-4 pb-24 pt-6">
      <p className="text-[11px] uppercase tracking-[0.22em] text-mint-400">
        Inbox
      </p>
      <h1 className="font-display text-3xl">Messages</h1>

      {rows.length === 0 ? (
        <p className="mt-10 text-white/50">
          No chats yet. Open a profile and say hello.
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {rows.map(({ thread, person }) => {
            const last = thread.messages[thread.messages.length - 1];
            return (
              <li key={thread.personId}>
                <button
                  type="button"
                  onClick={() => onOpen(thread.personId)}
                  className="flex w-full items-center gap-3 rounded-2xl bg-ink-800 p-3 text-left"
                >
                  <img
                    src={person!.photo}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {person!.name}
                        {person!.online && (
                          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-mint-400" />
                        )}
                      </p>
                      <span className="text-[11px] text-white/40">{last?.at}</span>
                    </div>
                    <p className="truncate text-sm text-white/55">{last?.text}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
