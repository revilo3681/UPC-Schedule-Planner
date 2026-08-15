import {
  ClassSession,
  Conflict,
  Course,
  CourseSection,
  DayOfWeek,
  DAY_ORDER,
  ScheduleCombination,
  ScheduleStats,
  SelectedCourseMap,
} from '../types/schedule';

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const parts = clean.split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hh = h.toString().padStart(2, '0');
  const mm = m.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const mins = timeToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, '0');
  return `${displayH}:${mm} ${ampm}`;
}

export function doSessionsOverlap(s1: ClassSession, s2: ClassSession): boolean {
  if (s1.day !== s2.day) return false;
  const start1 = timeToMinutes(s1.startTime);
  const end1 = timeToMinutes(s1.endTime);
  const start2 = timeToMinutes(s2.startTime);
  const end2 = timeToMinutes(s2.endTime);

  return start1 < end2 && start2 < end1;
}

export function getOverlapInterval(s1: ClassSession, s2: ClassSession): { start: string; end: string } {
  const start1 = timeToMinutes(s1.startTime);
  const end1 = timeToMinutes(s1.endTime);
  const start2 = timeToMinutes(s2.startTime);
  const end2 = timeToMinutes(s2.endTime);

  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  return {
    start: minutesToTime(overlapStart),
    end: minutesToTime(overlapEnd),
  };
}

export interface ActiveSessionEntry {
  course: Course;
  section: CourseSection;
  session: ClassSession;
}

export function getActiveSessions(
  courses: Course[],
  selectedSections: SelectedCourseMap
): ActiveSessionEntry[] {
  const result: ActiveSessionEntry[] = [];

  for (const course of courses) {
    const sectionId = selectedSections[course.id];
    if (!sectionId) continue;
    const section = course.sections.find((s) => s.id === sectionId);
    if (!section) continue;

    for (const session of section.sessions) {
      result.push({
        course,
        section,
        session,
      });
    }
  }

  return result;
}

export function detectConflicts(
  courses: Course[],
  selectedSections: SelectedCourseMap
): Conflict[] {
  const active = getActiveSessions(courses, selectedSections);
  const conflicts: Conflict[] = [];

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const itemA = active[i];
      const itemB = active[j];

      // If they belong to the same course and section, ignore
      if (itemA.course.id === itemB.course.id && itemA.section.id === itemB.section.id) {
        continue;
      }

      if (doSessionsOverlap(itemA.session, itemB.session)) {
        const overlap = getOverlapInterval(itemA.session, itemB.session);
        conflicts.push({
          id: `${itemA.course.id}-${itemA.session.id}__${itemB.course.id}-${itemB.session.id}`,
          courseA: itemA.course,
          sectionA: itemA.section,
          sessionA: itemA.session,
          courseB: itemB.course,
          sectionB: itemB.section,
          sessionB: itemB.session,
          day: itemA.session.day,
          overlapStart: overlap.start,
          overlapEnd: overlap.end,
        });
      }
    }
  }

  return conflicts;
}

export function calculateScheduleStats(
  courses: Course[],
  selectedSections: SelectedCourseMap
): ScheduleStats {
  const active = getActiveSessions(courses, selectedSections);
  const conflicts = detectConflicts(courses, selectedSections);

  let totalCredits = 0;
  for (const course of courses) {
    if (selectedSections[course.id]) {
      totalCredits += course.credits;
    }
  }

  // Calculate day-by-day span and class time
  const dayBuckets: Record<DayOfWeek, { start: number; end: number; duration: number }[]> = {
    LU: [],
    MA: [],
    MI: [],
    JU: [],
    VI: [],
    SA: [],
    DO: [],
  };

  let totalClassMinutes = 0;

  for (const entry of active) {
    const sMin = timeToMinutes(entry.session.startTime);
    const eMin = timeToMinutes(entry.session.endTime);
    const duration = Math.max(0, eMin - sMin);
    totalClassMinutes += duration;

    dayBuckets[entry.session.day].push({
      start: sMin,
      end: eMin,
      duration,
    });
  }

  let totalSpanMinutes = 0;
  let daysCount = 0;
  let emptyMinutes = 0;

  for (const day of DAY_ORDER) {
    const sessions = dayBuckets[day];
    if (sessions.length === 0) continue;

    daysCount++;
    const minStart = Math.min(...sessions.map((s) => s.start));
    const maxEnd = Math.max(...sessions.map((s) => s.end));
    const daySpan = Math.max(0, maxEnd - minStart);
    totalSpanMinutes += daySpan;

    // Merge overlapping intervals for true class coverage
    const sorted = [...sessions].sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    for (const cur of sorted) {
      if (merged.length === 0) {
        merged.push({ start: cur.start, end: cur.end });
      } else {
        const last = merged[merged.length - 1];
        if (cur.start <= last.end) {
          last.end = Math.max(last.end, cur.end);
        } else {
          merged.push({ start: cur.start, end: cur.end });
        }
      }
    }

    const occupiedMinutes = merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
    const dayGaps = Math.max(0, daySpan - occupiedMinutes);
    emptyMinutes += dayGaps;
  }

  const activeHours = parseFloat((totalClassMinutes / 60).toFixed(1));
  const emptyHours = parseFloat((emptyMinutes / 60).toFixed(1));
  const efficiencyScore =
    totalSpanMinutes > 0
      ? parseFloat(((totalClassMinutes / totalSpanMinutes) * 100).toFixed(2))
      : 100;

  return {
    totalCredits,
    emptyHours,
    activeHours,
    daysCount,
    conflictsCount: conflicts.length,
    efficiencyScore,
  };
}

export function generateAllCombinations(
  courses: Course[],
  targetCourseIds: string[]
): ScheduleCombination[] {
  const selectedCourses = courses.filter(
    (c) => targetCourseIds.includes(c.id) && c.sections && c.sections.length > 0
  );

  if (selectedCourses.length === 0) return [];

  const results: ScheduleCombination[] = [];
  const MAX_RESULTS = 100;
  const MAX_EVALUATIONS = 15000;
  let evaluationsCount = 0;

  // Pre-extract sessions for each section to avoid repeated object accesses
  interface CachedSection {
    courseId: string;
    sectionId: string;
    sessions: ClassSession[];
  }

  const courseSectionPool: CachedSection[][] = selectedCourses.map((c) =>
    c.sections.map((s) => ({
      courseId: c.id,
      sectionId: s.id,
      sessions: s.sessions || [],
    }))
  );

  // Quick conflict test between a list of placed sessions and a new section's sessions
  function hasConflictWithPlaced(placed: ClassSession[], newSessions: ClassSession[]): boolean {
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i];
      for (let j = 0; j < newSessions.length; j++) {
        const n = newSessions[j];
        if (doSessionsOverlap(p, n)) {
          return true;
        }
      }
    }
    return false;
  }

  function countConflicts(placed: ClassSession[]): number {
    let count = 0;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        if (doSessionsOverlap(placed[i], placed[j])) {
          count++;
        }
      }
    }
    return count;
  }

  // Pass 1: Prune aggressively for zero conflicts (Branch-and-Bound)
  function backtrackZeroConflicts(
    courseIdx: number,
    currentMap: SelectedCourseMap,
    currentPlacedSessions: ClassSession[]
  ) {
    if (results.length >= MAX_RESULTS || evaluationsCount >= MAX_EVALUATIONS) {
      return;
    }

    if (courseIdx === selectedCourses.length) {
      evaluationsCount++;
      const stats = calculateScheduleStats(selectedCourses, currentMap);
      const tags: string[] = ['Sin cruces'];

      if (stats.emptyHours === 0) {
        tags.push('Cero huecos');
      } else if (stats.emptyHours <= 3) {
        tags.push('Muy compacto');
      }

      if (stats.daysCount <= 4) {
        tags.push(`${stats.daysCount} días`);
      }

      const hasFri = currentPlacedSessions.some((s) => s.day === 'VI');
      const hasSat = currentPlacedSessions.some((s) => s.day === 'SA');
      if (!hasFri) tags.push('Viernes libre');
      if (!hasSat) tags.push('Sábado libre');

      results.push({
        id: `comb-${results.length + 1}`,
        selectedSections: { ...currentMap },
        stats,
        tags,
      });
      return;
    }

    const sections = courseSectionPool[courseIdx];
    for (const sec of sections) {
      evaluationsCount++;
      // PRUNE IMMEDIATELY: If this section overlaps with anything already placed, skip exploring this branch!
      if (hasConflictWithPlaced(currentPlacedSessions, sec.sessions)) {
        continue;
      }

      currentMap[sec.courseId] = sec.sectionId;
      const nextPlaced = currentPlacedSessions.concat(sec.sessions);
      backtrackZeroConflicts(courseIdx + 1, currentMap, nextPlaced);

      if (results.length >= MAX_RESULTS || evaluationsCount >= MAX_EVALUATIONS) {
        return;
      }
    }
  }

  // Run Pass 1 (Zero conflicts)
  backtrackZeroConflicts(0, {}, []);

  // Pass 2: If we didn't find enough zero-conflict combinations (e.g. impossible schedule), search allowing minimal conflicts
  if (results.length < 10 && evaluationsCount < MAX_EVALUATIONS) {
    const seenCombKeys = new Set(
      results.map((r) =>
        Object.entries(r.selectedSections)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([c, s]) => `${c}:${s}`)
          .join('|')
      )
    );

    function backtrackWithMinimalConflicts(
      courseIdx: number,
      currentMap: SelectedCourseMap,
      currentPlacedSessions: ClassSession[]
    ) {
      if (results.length >= MAX_RESULTS || evaluationsCount >= MAX_EVALUATIONS) {
        return;
      }

      if (courseIdx === selectedCourses.length) {
        evaluationsCount++;
        const combKey = Object.entries(currentMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([c, s]) => `${c}:${s}`)
          .join('|');

        if (seenCombKeys.has(combKey)) return;
        seenCombKeys.add(combKey);

        const stats = calculateScheduleStats(selectedCourses, currentMap);
        const tags: string[] = [];

        if (stats.conflictsCount === 0) {
          tags.push('Sin cruces');
        } else {
          tags.push(`${stats.conflictsCount} cruce(s)`);
        }

        if (stats.emptyHours === 0) {
          tags.push('Cero huecos');
        } else if (stats.emptyHours <= 3) {
          tags.push('Muy compacto');
        }

        if (stats.daysCount <= 4) {
          tags.push(`${stats.daysCount} días`);
        }

        const hasFri = currentPlacedSessions.some((s) => s.day === 'VI');
        const hasSat = currentPlacedSessions.some((s) => s.day === 'SA');
        if (!hasFri) tags.push('Viernes libre');
        if (!hasSat) tags.push('Sábado libre');

        results.push({
          id: `comb-${results.length + 1}`,
          selectedSections: { ...currentMap },
          stats,
          tags,
        });
        return;
      }

      const sections = courseSectionPool[courseIdx];
      for (const sec of sections) {
        evaluationsCount++;
        // Prune if current branch already exceeds 2 conflicts
        const testPlaced = currentPlacedSessions.concat(sec.sessions);
        if (countConflicts(testPlaced) > 2) {
          continue;
        }

        currentMap[sec.courseId] = sec.sectionId;
        backtrackWithMinimalConflicts(courseIdx + 1, currentMap, testPlaced);

        if (results.length >= MAX_RESULTS || evaluationsCount >= MAX_EVALUATIONS) {
          return;
        }
      }
    }

    backtrackWithMinimalConflicts(0, {}, []);
  }

  // Sort results: zero conflicts first, fewest empty hours, highest efficiency
  results.sort((a, b) => {
    if (a.stats.conflictsCount !== b.stats.conflictsCount) {
      return a.stats.conflictsCount - b.stats.conflictsCount;
    }
    if (a.stats.emptyHours !== b.stats.emptyHours) {
      return a.stats.emptyHours - b.stats.emptyHours;
    }
    return b.stats.efficiencyScore - a.stats.efficiencyScore;
  });

  return results;
}
