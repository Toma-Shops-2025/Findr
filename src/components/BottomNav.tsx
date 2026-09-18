import { Grid2x2, MessageCircle, User } from "lucide-react";
import type { Tab } from "../types";

const items: { id: Tab; label: string; icon: typeof Grid2x2 }[] = [
  { id: "nearby", label: "Nearby", icon: Grid2x2 },
  { id: "inbox", label: "Inbox", icon: MessageCircle },
  { id: "me", label: "Me", icon: User },
];

export function BottomNav({
  tab,
  unread,
  onChange,
}: {
  tab: Tab;
  unread: number;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-ink-900/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`relative flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-medium ${
                active ? "text-mint-400" : "text-white/45"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
              {item.id === "inbox" && unread > 0 && (
                <span className="absolute right-3 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-flare-500 px-1 text-[10px] text-white">
                  {unread}
                </span>
              )}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
