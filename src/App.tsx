import { useMemo, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { Shell } from "./components/Shell";
import { people } from "./data/people";
import { defaultFilters, defaultMe, matchesFilters } from "./lib/match";
import { Chat } from "./screens/Chat";
import { FiltersScreen } from "./screens/Filters";
import { Inbox } from "./screens/Inbox";
import { MeScreen } from "./screens/Me";
import { Nearby } from "./screens/Nearby";
import { Onboarding } from "./screens/Onboarding";
import { PersonProfile } from "./screens/PersonProfile";
import { Welcome } from "./screens/Welcome";
import type { Filters, Me, Screen, Thread } from "./types";

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "welcome" });
  const [me, setMe] = useState<Me>(defaultMe);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [threads, setThreads] = useState<Thread[]>([]);

  const visible = useMemo(
    () =>
      people
        .filter((person) => matchesFilters(me, person, filters))
        .sort((a, b) => a.distanceMi - b.distanceMi),
    [me, filters],
  );

  const unread = threads.filter((t) =>
    t.messages.some((m) => !m.fromMe),
  ).length;

  function openChat(personId: string) {
    setThreads((current) =>
      current.some((t) => t.personId === personId)
        ? current
        : [...current, { personId, messages: [] }],
    );
    setScreen({ name: "chat", personId });
  }

  function sendMessage(personId: string, text: string) {
    const at = "now";
    setThreads((current) =>
      current.map((thread) =>
        thread.personId === personId
          ? {
              ...thread,
              messages: [
                ...thread.messages,
                { id: crypto.randomUUID(), fromMe: true, text, at },
              ],
            }
          : thread,
      ),
    );
  }

  let body;
  if (screen.name === "welcome") {
    body = <Welcome onStart={() => setScreen({ name: "onboarding" })} />;
  } else if (screen.name === "onboarding") {
    body = (
      <Onboarding
        me={me}
        onChange={(patch) => setMe((current) => ({ ...current, ...patch }))}
        onDone={() => setScreen({ name: "app", tab: "nearby" })}
      />
    );
  } else if (screen.name === "filters") {
    body = (
      <FiltersScreen
        filters={filters}
        onChange={setFilters}
        onBack={() => setScreen({ name: "app", tab: "nearby" })}
      />
    );
  } else if (screen.name === "profile") {
    const person = people.find((p) => p.id === screen.personId);
    body = person ? (
      <PersonProfile
        person={person}
        onBack={() => setScreen({ name: "app", tab: "nearby" })}
        onMessage={() => openChat(person.id)}
      />
    ) : null;
  } else if (screen.name === "chat") {
    const person = people.find((p) => p.id === screen.personId);
    const thread = threads.find((t) => t.personId === screen.personId);
    body =
      person && thread ? (
        <Chat
          person={person}
          thread={thread}
          onBack={() => setScreen({ name: "app", tab: "inbox" })}
          onSend={(text) => sendMessage(person.id, text)}
        />
      ) : null;
  } else {
    body = (
      <>
        {screen.tab === "nearby" && (
          <Nearby
            people={visible}
            onOpen={(id) => setScreen({ name: "profile", personId: id })}
            onFilters={() => setScreen({ name: "filters" })}
          />
        )}
        {screen.tab === "inbox" && (
          <Inbox
            threads={threads}
            people={people}
            onOpen={(id) => setScreen({ name: "chat", personId: id })}
          />
        )}
        {screen.tab === "me" && (
          <MeScreen me={me} onEdit={() => setScreen({ name: "onboarding" })} />
        )}
        <BottomNav
          tab={screen.tab}
          unread={unread}
          onChange={(tab) => setScreen({ name: "app", tab })}
        />
      </>
    );
  }

  return <Shell>{body}</Shell>;
}
