export type PreferenceLevel = "must-see" | "nice-to-see" | "neutral" | "avoid";

export type FestivalSet = {
  id: string;
  artist: string;
  stage: string;
  startTime: Date;
  endTime: Date;
  genre?: string;
  day: string; // "Friday" | "Saturday" | "Sunday"
  notes?: string;
};

export type ArtistPreference = {
  artist: string;
  level: PreferenceLevel;
};

export type UserPreferences = {
  defaultWalkingMinutes: number;
  allowPartialSets: boolean;
  minimumSetMinutes: number;
};

export type ItineraryItem = {
  id: string;
  type: "set" | "transition" | "break" | "conflict";
  startTime: Date;
  endTime: Date;
  artist?: string;
  stage?: string;
  fromStage?: string;
  toStage?: string;
  notes?: string;
  isPartial?: boolean;
  preferenceLevel?: PreferenceLevel;
};

export type ConflictExplanation = {
  id: string;
  conflictingSets: FestivalSet[];
  reason: string;
  chosenSetId?: string;
};

export type GeneratedItinerary = {
  items: ItineraryItem[];
  conflicts: ConflictExplanation[];
  score: number;
};
