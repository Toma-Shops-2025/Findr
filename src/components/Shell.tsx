import type { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#040406] md:grid md:place-items-center md:p-8">
      <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-ink-950 md:h-[844px] md:max-h-[calc(100dvh-4rem)] md:rounded-[2rem] md:border md:border-white/10 md:shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </div>
  );
}
