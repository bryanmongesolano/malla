export type CourseStatus = 'bloqueada' | 'disponible' | 'cursando' | 'completada';

export type StoredStatus = 'cursando' | 'completada';

export interface BaseCourse {
  id: string;
  name: string;
  credits: number;
  period: number;
  area: string;
  prereqs: string[];
}

export interface StandardCourse extends BaseCourse {
  type?: 'course';
}

export interface ElectiveOption {
  id: string;
  name: string;
  credits: number;
  prereqs: string[];
  area?: string;
}

export interface ElectiveBlock extends BaseCourse {
  type: 'electiveBlock';
  required: number;
  options: ElectiveOption[];
}

export type CurriculumItem = StandardCourse | ElectiveBlock;

export interface Curriculum {
  program: string;
  institution: string;
  totalCourses: number;
  totalCredits: number;
  periods: number;
  periodType: string;
  creditsPerPeriodRange: [number, number];
  courses: CurriculumItem[];
}

export interface UserSettings {
  coursesPerPeriod: number;
}

export interface UserState {
  username: string;
  progress: Record<string, StoredStatus>;
  settings: UserSettings;
}

export interface TransitionCheckResult {
  allowed: boolean;
  reason?: string;
  blockingDependents?: string[];
  missingPrereqs?: string[];
}

export interface SimulationPeriod {
  periodIndex: number;
  label: string; // e.g. "Ene–Abr 2027"
  itemIds: string[];
}

export interface SimulationResult {
  periodsRemaining: number;
  estimatedGraduationDate: string; // e.g. "Dic 2028"
  periods: SimulationPeriod[];
  criticalPath: string[];
}

export interface OverallProgress {
  totalUnits: number;
  completedUnits: number;
  cursandoUnits: number;
  availableUnits: number;
  blockedUnits: number;
  percentCompleted: number;
  totalCredits: number;
  completedCredits: number;
}
