import { Course, CourseSection } from '../types/schedule';
import { FaceRating, Professor } from '../types/professors';

export function normalizePersonName(name?: string): string {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function isPlaceholderTeacher(name?: string): boolean {
  const n = normalizePersonName(name);
  return !n || n === 'docente asignado' || n === 'docente upc' || n === 'por asignar';
}

export function teacherMatchesFavorite(teacher: string | undefined, favoriteNames: string[]): boolean {
  if (!teacher || favoriteNames.length === 0 || isPlaceholderTeacher(teacher)) return false;
  const t = normalizePersonName(teacher);
  return favoriteNames.some((fav) => {
    const f = normalizePersonName(fav);
    return f && (t.includes(f) || f.includes(t));
  });
}

export function sectionHasFavoriteTeacher(section: CourseSection, favoriteNames: string[]): boolean {
  const names = [
    ...section.teachers,
    ...section.sessions.map((sess) => sess.teacher || ''),
  ];
  return names.some((name) => teacherMatchesFavorite(name, favoriteNames));
}

export function favoriteTeacherNames(professors: Professor[]): string[] {
  return professors.filter((p) => p.favorite).map((p) => p.name);
}

export function mergeProfessorLists(base: Professor[], extra: Professor[]): Professor[] {
  const byKey = new Map<string, Professor>();
  [...base, ...extra].forEach((prof) => {
    const key = normalizePersonName(prof.name);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, {
        ...prof,
        courses: [...prof.courses],
        reviews: [...prof.reviews],
      });
      return;
    }
    const reviewIds = new Set(current.reviews.map((r) => r.id));
    byKey.set(key, {
      ...current,
      favorite: current.favorite || prof.favorite,
      sourceCount: Math.max(current.sourceCount || 0, prof.sourceCount || 0),
      sourceAverage: prof.sourceAverage || current.sourceAverage,
      courses: Array.from(new Set([...current.courses, ...prof.courses])),
      reviews: [
        ...current.reviews,
        ...prof.reviews.filter((review) => !reviewIds.has(review.id)),
      ],
    });
  });
  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function mergeProfessorsFromCourses(existing: Professor[], courses: Course[]): Professor[] {
  const byKey = new Map<string, Professor>();
  existing.forEach((prof) => {
    byKey.set(normalizePersonName(prof.name), {
      ...prof,
      courses: [...prof.courses],
      reviews: [...prof.reviews],
    });
  });

  courses.forEach((course) => {
    course.sections.forEach((section) => {
      const names = new Set(
        [...section.teachers, ...section.sessions.map((sess) => sess.teacher || '')].filter(
          (name) => !isPlaceholderTeacher(name)
        )
      );
      names.forEach((name) => {
        const key = normalizePersonName(name);
        const current = byKey.get(key);
        if (current) {
          if (!current.courses.includes(course.name)) {
            current.courses = [...current.courses, course.name];
          }
        } else {
          byKey.set(key, {
            id: `prof-${key.replace(/\s+/g, '-')}`,
            name: name.trim(),
            courses: [course.name],
            favorite: false,
            reviews: [],
          });
        }
      });
    });
  });

  return Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function faceLabel(rating: FaceRating): string {
  if (rating === 'happy') return 'Feliz';
  if (rating === 'sad') return 'Triste';
  return 'Regular';
}

export function faceEmoji(rating: FaceRating): string {
  if (rating === 'happy') return '😊';
  if (rating === 'sad') return '😞';
  return '😐';
}

export function moodFromAverage(average?: number): FaceRating | null {
  if (average == null || average <= 0) return null;
  if (average >= 7.5) return 'happy';
  if (average >= 5) return 'regular';
  return 'sad';
}

export function professorMood(professor: Professor): FaceRating | null {
  if (professor.reviews.length > 0) {
    const score = professor.reviews.reduce((sum, review) => {
      if (review.rating === 'happy') return sum + 1;
      if (review.rating === 'sad') return sum - 1;
      return sum;
    }, 0);
    if (score > 0) return 'happy';
    if (score < 0) return 'sad';
    return 'regular';
  }
  return moodFromAverage(professor.sourceAverage);
}
