export type DayOfWeek = 'LU' | 'MA' | 'MI' | 'JU' | 'VI' | 'SA' | 'DO';

export type SessionType = 'Teoría' | 'Laboratorio' | 'Práctica' | 'Taller';

export type Modality = 'Presencial' | 'Semipresencial' | 'A distancia' | 'Virtual';

export interface ClassSession {
  id: string;
  day: DayOfWeek;
  startTime: string; // "07:00", "08:00", "14:00"
  endTime: string;   // "09:59", "10:00", "16:00"
  type: SessionType;
  modality: Modality;
  campus?: string;   // "San Isidro", "Monterrico", "Villa", "San Miguel", "Online"
  classroom?: string; // "Aula 402", "Lab 101"
  teacher?: string;
}

export interface CourseSection {
  id: string;         // NRC or Group identifier e.g. "15969" or "G1"
  sectionName: string; // e.g. "1", "21", "1ASI", "G1"
  courseCode: string;
  teachers: string[];
  sessions: ClassSession[];
  vacancies?: string;  // e.g. "30 de 30 lugares", "0 / 40"
  restrictions?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  cycle: number;
  color: string;
  sections: CourseSection[];
}

export interface SelectedCourseMap {
  [courseId: string]: string; // courseId -> sectionId (NRC)
}

export interface Conflict {
  id: string;
  courseA: Course;
  sectionA: CourseSection;
  sessionA: ClassSession;
  courseB: Course;
  sectionB: CourseSection;
  sessionB: ClassSession;
  day: DayOfWeek;
  overlapStart: string;
  overlapEnd: string;
}

export interface ScheduleStats {
  totalCredits: number;
  emptyHours: number;
  activeHours: number;
  daysCount: number;
  conflictsCount: number;
  efficiencyScore: number;
}

export interface ScheduleCombination {
  id: string;
  selectedSections: SelectedCourseMap;
  stats: ScheduleStats;
  tags: string[]; // e.g. ["Sin cruces", "Viernes libre", "Compacto", "Mañanas"]
}

export const DAY_NAMES: Record<DayOfWeek, string> = {
  LU: 'Lunes',
  MA: 'Martes',
  MI: 'Miércoles',
  JU: 'Jueves',
  VI: 'Viernes',
  SA: 'Sábado',
  DO: 'Domingo',
};

export const DAY_ORDER: DayOfWeek[] = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

export const COURSE_COLOR_PALETTE = [
  '#0d9488', // Teal
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#a855f7', // Purple
  '#0ea5e9', // Sky blue
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#14b8a6', // Cyan-Teal
  '#64748b', // Slate
];

export interface StudentProfile {
  fullName: string;
  studentCode: string; // e.g. "u202000001"
  email: string;       // e.g. "u202000001@upc.edu.pe"
  career: string;      // e.g. "Ingeniería de Software"
  campus: string;      // e.g. "San Isidro" | "Monterrico" | "San Miguel" | "Villa"
  currentCycle: number; // 1 - 10
  userDistrict: string; // e.g. "Santiago de Surco"
}

