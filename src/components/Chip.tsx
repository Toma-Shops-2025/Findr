import type { ReactNode } from "react";

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "border-mint-400 bg-mint-400/15 text-mint-300"
          : "border-white/15 bg-white/5 text-white/75 hover:border-white/30"
      }`}
    >
      {children}
    </button>
  );
}
