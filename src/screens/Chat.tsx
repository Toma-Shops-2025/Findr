import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";
import type { Person, Thread } from "../types";

export function Chat({
  person,
  thread,
  onBack,
  onSend,
}: {
  person: Person;
  thread: Thread;
  onBack: () => void;
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  function submit() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col bg-ink-950">
      <header className="flex items-center gap-3 border-b border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 place-items-center rounded-full bg-ink-800"
        >
          <ArrowLeft size={18} />
        </button>
        <img src={person.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div>
          <p className="font-semibold leading-tight">{person.name}</p>
          <p className="text-xs text-white/50">
            {person.online ? "Online" : person.lastActive}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {thread.messages.length === 0 && (
          <p className="text-center text-sm text-white/40">Say hello.</p>
        )}
        {thread.messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                message.fromMe
                  ? "bg-mint-400 text-ink-950"
                  : "bg-ink-700 text-white"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <form
        className="flex gap-2 border-t border-white/10 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${person.name}`}
          className="flex-1 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 outline-none focus:border-mint-400"
        />
        <button
          type="submit"
          className="grid h-12 w-12 place-items-center rounded-2xl bg-mint-400 text-ink-950"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
