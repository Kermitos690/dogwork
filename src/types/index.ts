export type Difficulty = "facile" | "moyenne" | "élevée" | "moyenne à élevée";
export type DayStatus = "todo" | "in_progress" | "done";
export type ResponseLevel = "oui" | "moyen" | "non";
export type QualityLevel = "bon" | "moyen" | "faible";
export type WalkQuality = "bonne" | "moyenne" | "difficile";
export type RecoverySpeed = "rapide" | "moyenne" | "lente";

export interface Exercise {
  id: string;
  dayId: number;
  name: string;
  instructions?: string;
  description?: string;
  slug?: string;
  repetitionsTarget: number;
  timerSuggested?: number | null;
  tutorialSteps?: { title: string; description: string; tip?: string }[];
  validationProtocol?: string;
}

export interface Day {
  id: number;
  week: number;
  title: string;
  objective: string;
  duration: string;
  difficulty: Difficulty;
  functions: string[];
  exercises: Exercise[];
  vigilance: string;
  validationCriteria: string;
}

export interface DayProgress {
  dayId: number;
  status: DayStatus;
  completedExercises: string[];
  notes: string;
  validated: boolean;
  lastUpdated: string;
}

export interface BehaviorLog {
  dayId: number;
  jumpOnHuman: boolean;
  barking: boolean;
  stopResponse: ResponseLevel;
  noResponse: ResponseLevel;
  focusQuality: QualityLevel;
  leashWalkQuality: WalkQuality;
  tensionLevel: number;
  dogReactionLevel: number;
  comfortDistanceMeters: number;
  recoveryAfterTrigger: RecoverySpeed;
  comments: string;
  createdAt: string;
}

export interface ExerciseSession {
  dayId: number;
  exerciseId: string;
  startedAt: string;
  endedAt: string | null;
  durationActual: number;
  repetitionsDone: number;
  completed: boolean;
}

export interface AppSettings {
  dogName: string;
  startDate: string;
  currentDay: number;
  theme: "light";
  safetyAcknowledged: boolean;
}

export interface ComputedStats {
  completedDays: number;
  completionRate: number;
  weeklyProgress: number[];
  avgTension: number;
  avgDogReaction: number;
  stopScore: number;
  noScore: number;
  focusScore: number;
  leashScore: number;
  hardestDays: number[];
  bestDays: number[];
}
