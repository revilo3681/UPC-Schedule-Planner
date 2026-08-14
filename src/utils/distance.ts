import { ActiveSessionEntry, timeToMinutes } from './scheduler';

export type UPCCampus = 'Monterrico' | 'San Isidro' | 'San Miguel' | 'Villa' | 'Online';

export interface CampusInfo {
  id: UPCCampus;
  name: string;
  shortName: string;
  address: string;
  district: string;
  color: string;
  badgeBg: string;
}

export const UPC_CAMPUSES: Record<UPCCampus, CampusInfo> = {
  Monterrico: {
    id: 'Monterrico',
    name: 'Campus Monterrico',
    shortName: 'MO',
    address: 'Av. Primavera 2390',
    district: 'Santiago de Surco',
    color: '#e31e24',
    badgeBg: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900',
  },
  'San Isidro': {
    id: 'San Isidro',
    name: 'Campus San Isidro',
    shortName: 'SI',
    address: 'Av. Salaverry 2255',
    district: 'San Isidro',
    color: '#2563eb',
    badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900',
  },
  'San Miguel': {
    id: 'San Miguel',
    name: 'Campus San Miguel',
    shortName: 'SM',
    address: 'Av. La Marina 2810',
    district: 'San Miguel',
    color: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
  },
  Villa: {
    id: 'Villa',
    name: 'Campus Villa',
    shortName: 'VI',
    address: 'Av. Alameda San Marcos cdra. 2',
    district: 'Chorrillos',
    color: '#d97706',
    badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900',
  },
  Online: {
    id: 'Online',
    name: 'Campus Virtual / Online',
    shortName: 'VIRT',
    address: 'Aula Virtual Blackboard / Zoom',
    district: 'Online',
    color: '#7c3aed',
    badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900',
  },
};

export const LIMA_DISTRICTS = [
  'Ancón',
  'Ate',
  'Barranco',
  'Bellavista (Callao)',
  'Breña',
  'Callao (Cercado)',
  'Carabayllo',
  'Carmen de la Legua Reynoso (Callao)',
  'Chaclacayo',
  'Chorrillos',
  'Cieneguilla',
  'Comas',
  'El Agustino',
  'Independencia',
  'Jesús María',
  'La Molina',
  'La Perla (Callao)',
  'La Punta (Callao)',
  'La Victoria',
  'Lima (Cercado)',
  'Lince',
  'Los Olivos',
  'Lurigancho-Chosica',
  'Lurín',
  'Magdalena del Mar',
  'Mi Perú (Callao)',
  'Miraflores',
  'Pachacámac',
  'Pucusana',
  'Pueblo Libre',
  'Puente Piedra',
  'Punta Hermosa',
  'Punta Negra',
  'Rímac',
  'San Bartolo',
  'San Borja',
  'San Isidro',
  'San Juan de Lurigancho',
  'San Juan de Miraflores',
  'San Luis',
  'San Martín de Porres',
  'San Miguel',
  'Santa Anita',
  'Santa María del Mar',
  'Santa Rosa',
  'Santiago de Surco',
  'Surquillo',
  'Ventanilla (Callao)',
  'Villa El Salvador',
  'Villa María del Triunfo',
] as const;

export type LimaDistrict = typeof LIMA_DISTRICTS[number];

// Travel time in minutes from each district to each UPC campus (approximate average commute time in Lima)
export const DISTRICT_COMMUTE_MATRIX: Record<LimaDistrict, Record<UPCCampus, number>> = {
  Ancón: { Monterrico: 95, 'San Isidro': 75, 'San Miguel': 70, Villa: 110, Online: 0 },
  Ate: { Monterrico: 25, 'San Isidro': 45, 'San Miguel': 60, Villa: 45, Online: 0 },
  Barranco: { Monterrico: 25, 'San Isidro': 25, 'San Miguel': 40, Villa: 18, Online: 0 },
  'Bellavista (Callao)': { Monterrico: 70, 'San Isidro': 35, 'San Miguel': 15, Villa: 75, Online: 0 },
  Breña: { Monterrico: 45, 'San Isidro': 20, 'San Miguel': 22, Villa: 55, Online: 0 },
  'Callao (Cercado)': { Monterrico: 75, 'San Isidro': 40, 'San Miguel': 22, Villa: 80, Online: 0 },
  Carabayllo: { Monterrico: 95, 'San Isidro': 70, 'San Miguel': 60, Villa: 105, Online: 0 },
  'Carmen de la Legua Reynoso (Callao)': { Monterrico: 65, 'San Isidro': 30, 'San Miguel': 20, Villa: 70, Online: 0 },
  Chaclacayo: { Monterrico: 50, 'San Isidro': 65, 'San Miguel': 80, Villa: 65, Online: 0 },
  Chorrillos: { Monterrico: 28, 'San Isidro': 40, 'San Miguel': 55, Villa: 10, Online: 0 },
  Cieneguilla: { Monterrico: 45, 'San Isidro': 65, 'San Miguel': 85, Villa: 55, Online: 0 },
  Comas: { Monterrico: 85, 'San Isidro': 55, 'San Miguel': 45, Villa: 95, Online: 0 },
  'El Agustino': { Monterrico: 35, 'San Isidro': 35, 'San Miguel': 45, Villa: 50, Online: 0 },
  Independencia: { Monterrico: 75, 'San Isidro': 45, 'San Miguel': 40, Villa: 85, Online: 0 },
  'Jesús María': { Monterrico: 38, 'San Isidro': 12, 'San Miguel': 18, Villa: 48, Online: 0 },
  'La Molina': { Monterrico: 18, 'San Isidro': 38, 'San Miguel': 55, Villa: 40, Online: 0 },
  'La Perla (Callao)': { Monterrico: 65, 'San Isidro': 30, 'San Miguel': 12, Villa: 70, Online: 0 },
  'La Punta (Callao)': { Monterrico: 75, 'San Isidro': 38, 'San Miguel': 18, Villa: 80, Online: 0 },
  'La Victoria': { Monterrico: 30, 'San Isidro': 18, 'San Miguel': 35, Villa: 40, Online: 0 },
  'Lima (Cercado)': { Monterrico: 48, 'San Isidro': 25, 'San Miguel': 28, Villa: 58, Online: 0 },
  Lince: { Monterrico: 32, 'San Isidro': 10, 'San Miguel': 25, Villa: 42, Online: 0 },
  'Los Olivos': { Monterrico: 75, 'San Isidro': 45, 'San Miguel': 38, Villa: 85, Online: 0 },
  'Lurigancho-Chosica': { Monterrico: 65, 'San Isidro': 75, 'San Miguel': 90, Villa: 75, Online: 0 },
  Lurín: { Monterrico: 35, 'San Isidro': 55, 'San Miguel': 70, Villa: 20, Online: 0 },
  'Magdalena del Mar': { Monterrico: 42, 'San Isidro': 15, 'San Miguel': 12, Villa: 50, Online: 0 },
  'Mi Perú (Callao)': { Monterrico: 90, 'San Isidro': 65, 'San Miguel': 50, Villa: 100, Online: 0 },
  Miraflores: { Monterrico: 22, 'San Isidro': 12, 'San Miguel': 30, Villa: 32, Online: 0 },
  Pachacámac: { Monterrico: 38, 'San Isidro': 60, 'San Miguel': 75, Villa: 25, Online: 0 },
  Pucusana: { Monterrico: 65, 'San Isidro': 85, 'San Miguel': 95, Villa: 50, Online: 0 },
  'Pueblo Libre': { Monterrico: 42, 'San Isidro': 18, 'San Miguel': 12, Villa: 52, Online: 0 },
  'Puente Piedra': { Monterrico: 90, 'San Isidro': 65, 'San Miguel': 55, Villa: 100, Online: 0 },
  'Punta Hermosa': { Monterrico: 45, 'San Isidro': 65, 'San Miguel': 80, Villa: 30, Online: 0 },
  'Punta Negra': { Monterrico: 48, 'San Isidro': 68, 'San Miguel': 82, Villa: 32, Online: 0 },
  Rímac: { Monterrico: 50, 'San Isidro': 28, 'San Miguel': 35, Villa: 60, Online: 0 },
  'San Bartolo': { Monterrico: 50, 'San Isidro': 70, 'San Miguel': 85, Villa: 35, Online: 0 },
  'San Borja': { Monterrico: 16, 'San Isidro': 18, 'San Miguel': 38, Villa: 32, Online: 0 },
  'San Isidro': { Monterrico: 30, 'San Isidro': 8, 'San Miguel': 22, Villa: 42, Online: 0 },
  'San Juan de Lurigancho': { Monterrico: 55, 'San Isidro': 42, 'San Miguel': 52, Villa: 68, Online: 0 },
  'San Juan de Miraflores': { Monterrico: 22, 'San Isidro': 40, 'San Miguel': 55, Villa: 16, Online: 0 },
  'San Luis': { Monterrico: 20, 'San Isidro': 22, 'San Miguel': 40, Villa: 38, Online: 0 },
  'San Martín de Porres': { Monterrico: 68, 'San Isidro': 42, 'San Miguel': 32, Villa: 78, Online: 0 },
  'San Miguel': { Monterrico: 52, 'San Isidro': 22, 'San Miguel': 8, Villa: 62, Online: 0 },
  'Santa Anita': { Monterrico: 28, 'San Isidro': 38, 'San Miguel': 52, Villa: 48, Online: 0 },
  'Santa María del Mar': { Monterrico: 52, 'San Isidro': 72, 'San Miguel': 88, Villa: 38, Online: 0 },
  'Santa Rosa': { Monterrico: 98, 'San Isidro': 78, 'San Miguel': 72, Villa: 112, Online: 0 },
  'Santiago de Surco': { Monterrico: 10, 'San Isidro': 28, 'San Miguel': 48, Villa: 22, Online: 0 },
  Surquillo: { Monterrico: 18, 'San Isidro': 16, 'San Miguel': 35, Villa: 28, Online: 0 },
  'Ventanilla (Callao)': { Monterrico: 88, 'San Isidro': 60, 'San Miguel': 45, Villa: 98, Online: 0 },
  'Villa El Salvador': { Monterrico: 32, 'San Isidro': 50, 'San Miguel': 65, Villa: 18, Online: 0 },
  'Villa María del Triunfo': { Monterrico: 28, 'San Isidro': 45, 'San Miguel': 60, Villa: 22, Online: 0 },
};

// Travel time between campuses in minutes (minimum safe buffer needed for student travel)
export const INTER_CAMPUS_TRAVEL_MINUTES: Record<UPCCampus, Record<UPCCampus, number>> = {
  Monterrico: { Monterrico: 0, 'San Isidro': 45, 'San Miguel': 65, Villa: 40, Online: 10 },
  'San Isidro': { Monterrico: 45, 'San Isidro': 0, 'San Miguel': 30, Villa: 50, Online: 10 },
  'San Miguel': { Monterrico: 65, 'San Isidro': 30, 'San Miguel': 0, Villa: 65, Online: 10 },
  Villa: { Monterrico: 40, 'San Isidro': 50, 'San Miguel': 65, Villa: 0, Online: 10 },
  Online: { Monterrico: 10, 'San Isidro': 10, 'San Miguel': 10, Villa: 10, Online: 0 },
};

export function getInterCampusTravelTime(campusA?: string, campusB?: string): number {
  const a = normalizeCampusName(campusA);
  const b = normalizeCampusName(campusB);
  if (a === b) return 0;
  return INTER_CAMPUS_TRAVEL_MINUTES[a]?.[b] || 45;
}

export interface CommuteEvaluation {
  campus: UPCCampus;
  minutes: number;
  label: string;
  badge: string;
  badgeClass: string;
  level: 'close' | 'medium' | 'far' | 'online';
}

export function evaluateCommute(district?: string, campusName?: string): CommuteEvaluation {
  let normalizedCampus: UPCCampus = 'Monterrico';
  if (!campusName) normalizedCampus = 'Monterrico';
  else if (/san isidro|salaverry|si/i.test(campusName)) normalizedCampus = 'San Isidro';
  else if (/villa|chorrillos|vi/i.test(campusName)) normalizedCampus = 'Villa';
  else if (/san miguel|marina|sm/i.test(campusName)) normalizedCampus = 'San Miguel';
  else if (/online|virtual|distancia/i.test(campusName)) normalizedCampus = 'Online';

  if (normalizedCampus === 'Online') {
    return {
      campus: 'Online',
      minutes: 0,
      label: 'Virtual (0 min)',
      badge: '💻 Online',
      badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      level: 'online',
    };
  }

  const validDistrict = (district && (district as LimaDistrict) in DISTRICT_COMMUTE_MATRIX)
    ? (district as LimaDistrict)
    : 'Santiago de Surco';

  const matrix = DISTRICT_COMMUTE_MATRIX[validDistrict] || DISTRICT_COMMUTE_MATRIX['Santiago de Surco'];
  const minutes = matrix[normalizedCampus] || 30;

  if (minutes <= 20) {
    return {
      campus: normalizedCampus,
      minutes,
      label: `Cerca (~${minutes} min)`,
      badge: '🟢 Cerca',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      level: 'close',
    };
  }
  if (minutes <= 40) {
    return {
      campus: normalizedCampus,
      minutes,
      label: `Medio (~${minutes} min)`,
      badge: '🟡 Medio',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      level: 'medium',
    };
  }
  return {
    campus: normalizedCampus,
    minutes,
    label: `Lejos (~${minutes} min)`,
    badge: '🔴 Lejos',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800',
    level: 'far',
  };
}

export interface InterCampusConflict {
  id: string;
  day: string;
  courseA: string;
  sectionA: string;
  campusA: UPCCampus;
  endTimeA: string;
  courseB: string;
  sectionB: string;
  campusB: UPCCampus;
  startTimeB: string;
  gapMinutes: number;
  requiredMinutes: number;
}

/**
 * Detects if a student has back-to-back in-person classes in different UPC campuses
 * with insufficient travel time between them on the same day.
 */
export function detectInterCampusConflicts(activeSessions: ActiveSessionEntry[]): InterCampusConflict[] {
  const warnings: InterCampusConflict[] = [];

  // Group active sessions by day
  const dayMap = new Map<string, ActiveSessionEntry[]>();
  for (const item of activeSessions) {
    const list = dayMap.get(item.session.day) || [];
    list.push(item);
    dayMap.set(item.session.day, list);
  }

  for (const [day, list] of dayMap.entries()) {
    // Sort chronologically by startTime
    const sorted = [...list].sort(
      (a, b) => timeToMinutes(a.session.startTime) - timeToMinutes(b.session.startTime)
    );

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const first = sorted[i];
        const second = sorted[j];

        // Skip if same course
        if (first.course.id === second.course.id) continue;

        const campusA = normalizeCampusName(first.session.campus);
        const campusB = normalizeCampusName(second.session.campus);

        // If either is virtual/online or same campus, no inter-campus physical travel is required
        if (campusA === campusB || campusA === 'Online' || campusB === 'Online') {
          continue;
        }

        const endA = timeToMinutes(first.session.endTime);
        const startB = timeToMinutes(second.session.startTime);

        // Check if second class starts after first ends
        if (startB >= endA) {
          const gap = startB - endA;
          const required = INTER_CAMPUS_TRAVEL_MINUTES[campusA]?.[campusB] || 50;

          if (gap < required) {
            warnings.push({
              id: `${first.course.id}-${second.course.id}-${day}`,
              day,
              courseA: first.course.name,
              sectionA: first.section.sectionName,
              campusA,
              endTimeA: first.session.endTime,
              courseB: second.course.name,
              sectionB: second.section.sectionName,
              campusB,
              startTimeB: second.session.startTime,
              gapMinutes: gap,
              requiredMinutes: required,
            });
          }
        }
      }
    }
  }

  return warnings;
}

export function normalizeCampusName(name?: string): UPCCampus {
  if (!name) return 'Monterrico';
  if (/san isidro|salaverry|si/i.test(name)) return 'San Isidro';
  if (/villa|chorrillos|vi/i.test(name)) return 'Villa';
  if (/san miguel|marina|sm/i.test(name)) return 'San Miguel';
  if (/online|virtual|distancia/i.test(name)) return 'Online';
  return 'Monterrico';
}
