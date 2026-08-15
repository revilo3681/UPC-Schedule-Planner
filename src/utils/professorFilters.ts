import { Course } from '../types/schedule';
import { Professor } from '../types/professors';
import { isPlaceholderTeacher, normalizePersonName } from './professors';

const STOP_WORDS = new Set([
  'de', 'la', 'el', 'y', 'para', 'del', 'los', 'las', 'un', 'una', 'en', 'con', 'por',
  'al', 'lo', 'a', 'e', 'o', 'the', 'and', 'of',
]);

export function normalizeFilterText(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function meaningfulTokens(value: string): string[] {
  return normalizeFilterText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function courseTeacherKeys(course: Course): Set<string> {
  const keys = new Set<string>();
  course.sections.forEach((section) => {
    [...section.teachers, ...section.sessions.map((sess) => sess.teacher || '')].forEach((name) => {
      if (!isPlaceholderTeacher(name)) keys.add(normalizePersonName(name));
    });
  });
  return keys;
}

const GENERIC_AREA_TAGS = new Set([
  'ingenieria',
  'ingeniera',
  'negocios',
  'derecho',
  'humanidades',
  'ciencias',
  'upc',
  'lima',
  'diseno',
  'comunicaciones',
  'comunicacion',
  'psicologia',
  'economia',
  'administracion',
  'arquitectura',
  'letras',
  'contabilidad',
  'marketing',
  'medicina',
  'generales',
  'monterrico',
]);

export function courseNameMatchesTag(courseName: string, tag: string): boolean {
  const course = normalizeFilterText(courseName);
  const label = normalizeFilterText(tag);
  if (!course || !label) return false;
  if (GENERIC_AREA_TAGS.has(label)) return false;
  if (course === label) return true;
  if (label.length >= 6 && course.includes(label)) return true;
  if (course.length >= 6 && label.includes(course)) return true;

  const courseTokens = meaningfulTokens(courseName);
  const tagTokens = meaningfulTokens(tag);
  if (courseTokens.length === 0 || tagTokens.length === 0) return false;

  const overlap = courseTokens.filter((token) =>
    tagTokens.some((other) => other === token || (token.length >= 6 && (other.includes(token) || token.includes(other))))
  );
  return overlap.length >= 2 || (overlap.length === 1 && overlap[0].length >= 6);
}

export function professorTeachesUserCourse(professor: Professor, course: Course): boolean {
  if (courseTeacherKeys(course).has(normalizePersonName(professor.name))) return true;
  return professor.courses.some((tag) => courseNameMatchesTag(course.name, tag));
}

export interface CareerArea {
  label: string;
  terms: string[];
}

export function careerAreasFor(career: string): CareerArea[] {
  const n = normalizeFilterText(career);
  const areas: CareerArea[] = [];

  if (n.includes('software')) {
    areas.push({
      label: 'Ingeniería de Software',
      terms: ['software', 'programacion', 'algoritmo', 'poo', 'ihc', 'computacion', 'ciberseguridad', 'requisitos'],
    });
  }
  if (n.includes('sistemas')) {
    areas.push({
      label: 'Sistemas de Información',
      terms: ['sistemas', 'informacion', 'computacion', 'software', 'ihc', 'arquitectura empresarial', 'base de datos'],
    });
  }
  if (n.includes('telecomunic') || n.includes('redes')) {
    areas.push({
      label: 'Redes y telecomunicaciones',
      terms: ['redes', 'telecomunic', 'electronica'],
    });
  }
  if (n.includes('industrial')) {
    areas.push({
      label: 'Ingeniería Industrial',
      terms: ['industrial', 'procesos', 'organizacion', 'direccion de empresas', 'ode'],
    });
  }
  if (n.includes('civil')) {
    areas.push({
      label: 'Ingeniería Civil',
      terms: ['civil', 'topografia', 'materiales', 'estatica', 'carreteras', 'construccion'],
    });
  }
  if (n.includes('mecatron')) {
    areas.push({
      label: 'Ingeniería Mecatrónica',
      terms: ['mecatronica', 'electronica', 'dibujo'],
    });
  }
  if (n.includes('electron')) {
    areas.push({
      label: 'Ingeniería Electrónica',
      terms: ['electronica', 'redes'],
    });
  }
  if (n.includes('negocio') || n.includes('administr')) {
    areas.push({
      label: 'Negocios y administración',
      terms: ['negocios', 'administracion', 'gerencia', 'emprendimiento', 'hoteleria'],
    });
  }
  if (n.includes('econom') || n.includes('finanz')) {
    areas.push({
      label: 'Economía y finanzas',
      terms: ['economia', 'finanzas', 'macroeconomia', 'microeconomia'],
    });
  }
  if (n.includes('marketing')) {
    areas.push({
      label: 'Marketing',
      terms: ['marketing', 'publicidad'],
    });
  }
  if (n.includes('arquitect') && !n.includes('comput')) {
    areas.push({
      label: 'Arquitectura',
      terms: ['arquitectura', 'taller', 'dibujo'],
    });
  }
  if (n.includes('diseno') || n.includes('gráfico') || n.includes('grafico')) {
    areas.push({
      label: 'Diseño',
      terms: ['diseno', 'grafico', 'arte'],
    });
  }
  if (n.includes('medic')) {
    areas.push({
      label: 'Medicina y salud',
      terms: ['medicina', 'salud', 'terapia'],
    });
  }
  if (n.includes('odont')) {
    areas.push({
      label: 'Odontología',
      terms: ['odontologia', 'salud'],
    });
  }
  if (n.includes('psicolog')) {
    areas.push({
      label: 'Psicología',
      terms: ['psicologia', 'procesos psicologicos'],
    });
  }
  if (n.includes('derecho')) {
    areas.push({
      label: 'Derecho',
      terms: ['derecho', 'contratacion', 'tributos'],
    });
  }
  if (n.includes('comunic') || n.includes('period')) {
    areas.push({
      label: 'Comunicación',
      terms: ['comunicacion', 'comunicaciones', 'periodismo', 'publicidad', 'audiovisual'],
    });
  }

  if (n.includes('ingenier')) {
    areas.push({
      label: 'Ciencias básicas',
      terms: ['calculo', 'matematica', 'fisica', 'quimica', 'estadistica', 'discreta'],
    });
    areas.push({
      label: 'Ingeniería',
      terms: ['ingenieria', 'ingeniera'],
    });
  }

  areas.push({
    label: 'Estudios generales',
    terms: ['humanidades', 'etica', 'lenguaje', 'cpl', 'seminario', 'filosofia', 'historia', 'ciudadania'],
  });

  return areas;
}

function professorMatchesTerms(professor: Professor, terms: string[]): boolean {
  const haystack = professor.courses.map(normalizeFilterText).join(' | ');
  return terms.some((term) => {
    const t = normalizeFilterText(term);
    return t.length >= 3 && haystack.includes(t);
  });
}

export interface ProfessorGroup {
  id: string;
  title: string;
  subtitle?: string;
  professors: Professor[];
}

export function groupProfessorsByUserCourses(
  professors: Professor[],
  courses: Course[]
): ProfessorGroup[] {
  return courses
    .map((course) => ({
      id: course.id,
      title: course.name,
      subtitle: course.code ? `${course.code} · ciclo ${course.cycle}` : `Ciclo ${course.cycle}`,
      professors: professors.filter((prof) => professorTeachesUserCourse(prof, course)),
    }))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

export function professorLetter(name: string): string {
  const raw = (name || '').trim();
  const last = raw.includes(',') ? raw.split(',')[0] : raw.split(/\s+/)[0];
  const ch = last
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(ch) ? ch : '#';
}

export function groupProfessorsByCareer(
  professors: Professor[],
  career: string
): ProfessorGroup[] {
  const areas = careerAreasFor(career);
  const assigned = new Set<string>();
  const groups: ProfessorGroup[] = [];

  areas.forEach((area) => {
    const isGenericEngineering = area.label === 'Ingeniería';
    const matches = professors.filter((prof) => {
      if (!professorMatchesTerms(prof, area.terms)) return false;
      if (isGenericEngineering && assigned.has(prof.id)) return false;
      return true;
    });
    matches.forEach((prof) => assigned.add(prof.id));
    if (matches.length > 0) {
      groups.push({
        id: `area-${normalizeFilterText(area.label).replace(/\s+/g, '-')}`,
        title: area.label,
        subtitle: `${matches.length} profe${matches.length === 1 ? '' : 's'}`,
        professors: matches,
      });
    }
  });

  return groups;
}
