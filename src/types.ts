export type Gender = "woman" | "man" | "nonbinary";
export type Orientation =
  | "straight"
  | "gay"
  | "lesbian"
  | "bisexual"
  | "pansexual"
  | "queer";
export type Intent = "dates" | "friends" | "right now" | "open";

export type Person = {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  orientation: Orientation;
  lookingFor: Gender[];
  intent: Intent;
  bio: string;
  photo: string;
  distanceMi: number;
  online: boolean;
  lastActive: string;
};

export type Me = {
  name: string;
  age: number;
  gender: Gender;
  orientation: Orientation;
  lookingFor: Gender[];
  intent: Intent;
  bio: string;
};

export type Filters = {
  genders: Gender[];
  orientations: Orientation[];
  intents: Intent[];
  minAge: number;
  maxAge: number;
  maxDistance: number;
  onlineOnly: boolean;
  mutualOnly: boolean;
};

export type Message = {
  id: string;
  fromMe: boolean;
  text: string;
  at: string;
};

export type Thread = {
  personId: string;
  messages: Message[];
};

export type Tab = "nearby" | "inbox" | "me";
export type Screen =
  | { name: "welcome" }
  | { name: "onboarding" }
  | { name: "app"; tab: Tab }
  | { name: "filters" }
  | { name: "profile"; personId: string }
  | { name: "chat"; personId: string };
