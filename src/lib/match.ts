import type { Filters, Gender, Me, Orientation, Person } from "./types";

export const defaultMe: Me = {
  name: "",
  age: 25,
  gender: "woman",
  orientation: "straight",
  lookingFor: ["man"],
  intent: "dates",
  bio: "",
};

export const defaultFilters: Filters = {
  genders: [],
  orientations: [],
  intents: [],
  minAge: 18,
  maxAge: 45,
  maxDistance: 10,
  onlineOnly: false,
  mutualOnly: true,
};

export function isMutual(me: Me, person: Person) {
  return (
    me.lookingFor.includes(person.gender) &&
    person.lookingFor.includes(me.gender)
  );
}

export function matchesFilters(me: Me, person: Person, filters: Filters) {
  if (person.age < filters.minAge || person.age > filters.maxAge) return false;
  if (person.distanceMi > filters.maxDistance) return false;
  if (filters.onlineOnly && !person.online) return false;
  if (filters.genders.length && !filters.genders.includes(person.gender)) {
    return false;
  }
  if (
    filters.orientations.length &&
    !filters.orientations.includes(person.orientation)
  ) {
    return false;
  }
  if (filters.intents.length && !filters.intents.includes(person.intent)) {
    return false;
  }
  if (filters.mutualOnly && !isMutual(me, person)) return false;
  return true;
}

export const genderLabel: Record<Gender, string> = {
  woman: "Women",
  man: "Men",
  nonbinary: "Nonbinary",
};

export const orientationLabel: Record<Orientation, string> = {
  straight: "Straight",
  gay: "Gay",
  lesbian: "Lesbian",
  bisexual: "Bisexual",
  pansexual: "Pansexual",
  queer: "Queer",
};
