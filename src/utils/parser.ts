import {
  ClassSession,
  Course,
  CourseSection,
  COURSE_COLOR_PALETTE,
  DayOfWeek,
  Modality,
  SelectedCourseMap,
  SessionType,
} from '../types/schedule';

export interface ScheduleImportResult {
  courses: Course[];
  selectedSections?: SelectedCourseMap;
}

export function normalizeDay(dayStr: string): DayOfWeek | null {
  if (!dayStr) return null;
  const d = dayStr.trim().toUpperCase();

  // Spanish
  if (d.startsWith('LU') || d.includes('LUN')) return 'LU';
  if (d.startsWith('MA') || d.includes('MAR')) return 'MA';
  if (d.startsWith('MI') || d.includes('MIÉ') || d.includes('MIE')) return 'MI';
  if (d.startsWith('JU') || d.includes('JUE')) return 'JU';
  if (d.startsWith('VI') || d.includes('VIE')) return 'VI';
  if (d.startsWith('SA') || d.includes('SÁB') || d.includes('SAB')) return 'SA';
  if (d.startsWith('DO') || d.includes('DOM')) return 'DO';

  // English fallback
  if (d.startsWith('MO')) return 'LU';
  if (d.startsWith('TU')) return 'MA';
  if (d.startsWith('WE')) return 'MI';
  if (d.startsWith('TH')) return 'JU';
  if (d.startsWith('FR')) return 'VI';
  if (d.startsWith('SAT')) return 'SA';
  if (d.startsWith('SU')) return 'DO';

  return null;
}

export function normalizeTime(tStr: string): string {
  if (!tStr) return '07:00';
  let clean = tStr.trim().toUpperCase();

  // Check 12h AM/PM
  const isPM = clean.includes('PM') || clean.includes('P.M.');
  const isAM = clean.includes('AM') || clean.includes('A.M.');
  clean = clean.replace(/[A-Z.\s]/g, '');

  let parts = clean.split(/[:.]/);
  let h = parseInt(parts[0], 10) || 7;
  let m = parts.length > 1 ? parseInt(parts[1], 10) || 0 : 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  h = Math.min(23, Math.max(0, h));
  m = Math.min(59, Math.max(0, m));

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function parseRomanCycle(str: string): number {
  if (!str) return 5;
  const s = str.trim().toUpperCase();
  const romanMap: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    C1: 1,
    C2: 2,
    C3: 3,
    C4: 4,
    C5: 5,
    C6: 6,
    C7: 7,
    C8: 8,
    C9: 9,
    C10: 10,
  };
  if (romanMap[s]) return romanMap[s];
  const num = parseInt(s.replace(/\D/g, ''), 10);
  return isNaN(num) ? 5 : Math.min(10, Math.max(1, num));
}

function campusFromBuilding(edificio: string): string | null {
  const upper = edificio
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ');
  if (/^MON\b|\bMONTERRICO\b/.test(upper)) return 'Monterrico';
  if (/^SIS\b|\bSAN ISIDRO\b/.test(upper)) return 'San Isidro';
  if (/^SMI\b|\bSAN MIGUEL\b/.test(upper)) return 'San Miguel';
  if (/^VIL\b|\bVILLA\b/.test(upper)) return 'Villa';
  return null;
}

export function extractCampus(text: string, defaultCampus: string = 'Monterrico'): string {
  const fromBuilding = campusFromBuilding(text);
  if (fromBuilding) return fromBuilding;
  const upper = text.toUpperCase().replace(/[_-]+/g, ' ');
  if (upper.includes('ONLINE') || upper.includes('VIRTUAL') || upper.includes('A DISTANCIA') || upper.includes('REMOTO')) {
    return 'Online';
  }
  if (upper.includes('SAN ISIDRO') || upper.includes('SALAVERRY')) {
    return 'San Isidro';
  }
  if (upper.includes('SAN MIGUEL') || upper.includes('LA MARINA')) {
    return 'San Miguel';
  }
  if (upper.includes('VILLA') || upper.includes('CHORRILLOS')) {
    return 'Villa';
  }
  if (upper.includes('MONTERRICO') || upper.includes('SURCO') || upper.includes('PRIMAVERA')) {
    return 'Monterrico';
  }
  return defaultCampus;
}

function stripQuotes(value: string): string {
  return value.replace(/^["'\s]+|["'\s]+$/g, '').trim();
}

function isBlankToken(value: string): boolean {
  const clean = stripQuotes(value);
  return !clean || clean === '-' || clean === '—' || clean === 'NA' || clean === 'N/A';
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function isHeaderLine(line: string): boolean {
  const lower = stripQuotes(line).toLowerCase();
  return (
    lower.startsWith('ciclo') ||
    lower.startsWith('codigo') ||
    lower.startsWith('código') ||
    lower.startsWith('curso') ||
    lower.startsWith('periodo') ||
    (lower.includes('créditos') && lower.includes('docente')) ||
    (lower.includes('creditos') && lower.includes('docente'))
  );
}

const TYPE_TOKEN = /^(TEORIA|TEORÍA|LABORATORIO|LAB|PRÁCTICA|PRACTICA|TALLER)$/i;
const CAMPUS_TOKEN = /^(MONTERRICO|SAN_ISIDRO|SAN_MIGUEL|VILLA|ONLINE|VIRTUAL|SURCO|CHORRILLOS)$/i;
const COURSE_CODE_TOKEN = /^\d[A-Z]{2,5}\d{0,6}$/i;

export function extractModality(text: string, campus: string = 'Monterrico'): Modality {
  const upper = text.toUpperCase();
  if (upper.includes('SEMIPRESENCIAL') || upper.includes('SEMI-PRESENCIAL') || upper.includes('HIBRIDO') || upper.includes('HÍBRIDO') || upper.includes('BLENDED')) {
    return 'Semipresencial';
  }
  if (
    upper.includes('A DISTANCIA') ||
    upper.includes('VIRTUAL') ||
    upper.includes('ONLINE') ||
    upper.includes('REMOTO') ||
    upper.includes('NO PRESENCIAL') ||
    upper.includes('TEAMS') ||
    upper.includes('BLACKBOARD') ||
    campus === 'Online'
  ) {
    return 'A distancia';
  }
  return 'Presencial';
}

export function extractSessionType(text: string): SessionType {
  const upper = text.toUpperCase();
  if (upper.includes('LAB') || upper.includes('COMPUTO') || upper.includes('CÓMPUTO')) {
    return 'Laboratorio';
  }
  if (upper.includes('PRAC') || upper.includes('PRÁC') || upper.includes('TALLER')) {
    return 'Práctica';
  }
  return 'Teoría';
}

const BANNER_SKIP =
  /^(Periodo:|El plan de|Regresar a|Buscar|Título|Página|Por página|Registros:|Horario|Detalles|Paneles|Guardar plan|Total de horas|2do Semestre|Clase en:|Fecha de |Alumno|Inscripción|Seleccionar|Planificar|Encontrar|Proyecciones|\*|de\s*$)/i;

const BANNER_COURSE_ROW =
  /^(.+?)\s+(\d[A-Z]{3})\s+(\d{3,4})\s+(\d{1,2})\s+(\d{4,5})\b\s*(.*)$/;

const BANNER_DAY_NAMES =
  /^(Ninguno|Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)(?:,\s*(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo))*$/i;

const BANNER_TEACHER = /^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúñüÜ'’.\- ]+,\s+[A-ZÁÉÍÓÚÑ]/;

function parseBannerDays(raw: string): DayOfWeek[] {
  if (!raw || /^ninguno$/i.test(raw.trim())) return [];
  return raw
    .split(',')
    .map((part) => normalizeDay(part.trim()))
    .filter((day): day is DayOfWeek => !!day);
}

function addUniqueTeacher(list: string[], name: string) {
  const clean = name.replace(/\(Principal\)/gi, '').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length < 4) return;
  if (!list.some((t) => t.toLowerCase() === clean.toLowerCase())) {
    list.push(clean);
  }
}

/**
 * Parses UPC Banner "Planificar → Encontrar clases" (tabla pegada).
 * Deduplica el mismo bloque en dos fechas (ciclo 1 / ciclo 2) y salta
 * el componente asíncrono "Ninguno / A distancia" sin hora.
 */
export function parseUPCBannerText(rawText: string): Course[] {
  const lines = rawText
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const coursesMap = new Map<string, Course>();

  let courseName = '';
  let courseCode = '';
  let credits = 4;
  let nrc = '';
  let teachers: string[] = [];
  let campus = 'Monterrico';
  let vacancies = '';
  let sectionMethod: Modality = 'Presencial';
  let pendingDays: DayOfWeek[] = [];
  let sessionType: SessionType = 'Teoría';

  const ensureSection = () => {
    if (!courseName || !nrc) return null;
    const courseKey = `${courseCode}::${courseName.toUpperCase()}`;
    let course = coursesMap.get(courseKey);
    if (!course) {
      course = {
        id: `c-${slugify(courseCode || 'upc')}-${slugify(courseName)}`,
        code: courseCode || `UPC-${100 + coursesMap.size}`,
        name: courseName,
        credits,
        cycle: parseRomanCycle(courseCode) || 1,
        color: COURSE_COLOR_PALETTE[coursesMap.size % COURSE_COLOR_PALETTE.length],
        sections: [],
      };
      coursesMap.set(courseKey, course);
    }
    let section = course.sections.find((s) => s.id === nrc);
    if (!section) {
      section = {
        id: nrc,
        sectionName: `NRC ${nrc} · ${campus}`,
        courseCode: course.code,
        teachers: [...teachers],
        vacancies: vacancies || undefined,
        sessions: [],
      };
      course.sections.push(section);
    } else {
      teachers.forEach((t) => addUniqueTeacher(section!.teachers, t));
      if (vacancies) section.vacancies = vacancies;
    }
    return section;
  };

  const addMeeting = (
    days: DayOfWeek[],
    startTime: string,
    endTime: string,
    meetingTipo: string,
    classroom: string,
    buildingCampus?: string | null
  ) => {
    if (days.length === 0 || !startTime || !endTime) return;
    if (buildingCampus) campus = buildingCampus;
    const section = ensureSection();
    if (!section) return;

    const isRemote = /distancia|virtual|online/i.test(meetingTipo);
    let meetingCampus = buildingCampus || campus;
    let meetingModality: Modality = sectionMethod;

    if (sectionMethod === 'A distancia') {
      meetingCampus = 'Online';
      meetingModality = 'A distancia';
    } else if (sectionMethod === 'Semipresencial') {
      meetingModality = isRemote ? 'A distancia' : 'Semipresencial';
      if (isRemote) meetingCampus = 'Online';
    } else if (isRemote) {
      meetingCampus = 'Online';
      meetingModality = 'A distancia';
    }

    for (const day of days) {
      const key = `${day}|${startTime}|${endTime}|${meetingModality}|${meetingCampus}`;
      const exists = section.sessions.some(
        (s) => `${s.day}|${s.startTime}|${s.endTime}|${s.modality}|${s.campus}` === key
      );
      if (exists) continue;
      section.sessions.push({
        id: `${nrc}-${day}-${startTime}-${section.sessions.length + 1}`,
        day,
        startTime,
        endTime,
        type: sessionType,
        modality: meetingModality,
        campus: meetingCampus,
        classroom: classroom || (meetingCampus === 'Online' ? 'Aula Virtual' : ''),
        teacher: teachers[0] || '',
      });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+/g, ' ').trim();
    if (!line || BANNER_SKIP.test(line)) continue;
    if (/^•\s*(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)/i.test(line)) continue;
    if (/^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)$/i.test(line)) continue;
    if (/^Agregar$/i.test(line)) continue;

    const courseRow = line.match(BANNER_COURSE_ROW);
    if (
      courseRow &&
      !/^(título|materia|instructor|campus)/i.test(courseRow[1]) &&
      courseRow[1].length >= 8
    ) {
      courseName = courseRow[1].replace(/\s+/g, ' ').trim();
      courseCode = courseRow[2].toUpperCase();
      credits = parseInt(courseRow[4], 10) || 4;
      nrc = courseRow[5];
      teachers = [];
      vacancies = '';
      sectionMethod = 'Presencial';
      pendingDays = [];
      const rest = courseRow[6] || '';
      const teacherOnRow = rest.match(BANNER_TEACHER);
      if (teacherOnRow) addUniqueTeacher(teachers, teacherOnRow[0]);
      const restDays = rest.match(BANNER_DAY_NAMES);
      if (restDays) pendingDays = parseBannerDays(restDays[0]);
      continue;
    }

    if (BANNER_TEACHER.test(line) && nrc) {
      addUniqueTeacher(teachers, line.split(/\s{2,}|\t/)[0]);
      continue;
    }

    if (BANNER_DAY_NAMES.test(line)) {
      pendingDays = parseBannerDays(line);
      continue;
    }

    const timeTipo = line.match(
      /(?:(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2}))?[^]*?Tipo:\s*(Presencial|A distancia|Semipresencial|Virtual)/i
    );
    if (timeTipo && nrc) {
      const start = timeTipo[1] ? normalizeTime(timeTipo[1]) : '';
      const end = timeTipo[2] ? normalizeTime(timeTipo[2]) : '';
      const salon = line.match(/Sal[oó]n:\s*([A-Za-z0-9-]+)/i)?.[1] || '';
      const edificio = line.match(/Edificio:\s*([^F]+?)(?=\s+Sal[oó]n:|$)/i)?.[1]?.trim() || '';
      const classroom =
        salon && salon.toLowerCase() !== 'ninguno'
          ? salon
          : /virtual/i.test(edificio)
            ? 'Aula Virtual'
            : '';
      addMeeting(pendingDays, start, end, timeTipo[3], classroom, campusFromBuilding(edificio));
      continue;
    }

    if (/^(Monterrico|San Isidro|San Miguel|Villa)$/i.test(line)) {
      campus = extractCampus(line, campus);
      const section = nrc ? coursesMap.get(`${courseCode}::${courseName.toUpperCase()}`)?.sections.find((s) => s.id === nrc) : null;
      if (section && sectionMethod !== 'A distancia') {
        section.sectionName = `NRC ${nrc} · ${campus}`;
      }
      continue;
    }

    const vac = line.match(/(\d+)\s*de\s*(\d+)\s*lugares/i);
    if (vac) {
      vacancies = `${vac[1]} / ${vac[2]}`;
      continue;
    }

    if (/\b(Semipresencial|Virtual|Presencial)\b/i.test(line) && nrc && !/Tipo:/i.test(line)) {
      if (/Semipresencial/i.test(line)) sectionMethod = 'Semipresencial';
      else if (/Virtual/i.test(line)) sectionMethod = 'A distancia';
      else if (/Presencial/i.test(line)) sectionMethod = 'Presencial';
      if (/Teor[ií]a|Laboratorio|Pr[aá]ctica/i.test(line)) {
        sessionType = extractSessionType(line);
      }
      const section = ensureSection();
      if (section) {
        if (sectionMethod === 'A distancia') {
          section.sectionName = `NRC ${nrc} · Online`;
          section.sessions.forEach((s) => {
            s.campus = 'Online';
            s.modality = 'A distancia';
          });
        } else if (sectionMethod === 'Semipresencial') {
          section.sessions.forEach((s) => {
            if (s.campus !== 'Online' && s.modality === 'Presencial') {
              s.modality = 'Semipresencial';
            }
          });
        }
      }
    }
  }

  return Array.from(coursesMap.values()).filter((c) => c.sections.some((s) => s.sessions.length > 0));
}

/**
 * Universal table / CSV / Prompt output parser
 * Supports:
 * - ChatGPT prompt format:
 *   CICLO CREDITOS CURSO TIPO HRS GR DOCENTE SEDE DIA1 INICIO1 FINAL1 DIA2 INICIO2 FINAL2
 * - Pipe separated / Tab separated rows from Excel, Banner, or Socarrates:
 *   CURSO | SECCION/NRC | TIPO | MODALIDAD | SEDE | AULA | DOCENTE | DIA | INICIO | FIN
 */
export function parseCSVFormat(rawText: string): Course[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const coursesMap = new Map<string, Course>();

  for (const line of lines) {
    if (isHeaderLine(line)) continue;

    let parts: string[];
    if (line.includes('|')) {
      parts = line.split('|').map((p) => stripQuotes(p)).filter((p) => !isBlankToken(p) || p === '');
    } else if (line.includes('\t')) {
      parts = line.split('\t').map((p) => stripQuotes(p));
    } else if ((line.match(/","/g) || []).length >= 3) {
      parts = line.split(',').map((p) => stripQuotes(p));
    } else {
      parts = parseSpaceSeparatedLine(line);
    }

    parts = parts.map((p) => stripQuotes(p));
    if (parts.length < 4) continue;

    const firstToken = parts[0] || '';
    const courseCode = COURSE_CODE_TOKEN.test(firstToken) ? firstToken.toUpperCase() : '';
    const cycle = parseRomanCycle(firstToken);
    const credits = parseInt(parts[1], 10) || 4;
    const courseName = (parts[2] || '').trim();
    if (!courseName || courseName.length < 3) continue;

    const campusFromParts = parts.find((p) => isCampusToken(p));
    let lineCampus = extractCampus(campusFromParts || line, 'Monterrico');
    const modalityToken = parts.find((p) => isModalityToken(p));
    let lineModality = extractModality(modalityToken || line, lineCampus);
    if (isModalityToken(modalityToken || '') && /VIRTUAL|ONLINE|A_DISTANCIA|A DISTANCIA/i.test(modalityToken || '')) {
      lineCampus = 'Online';
      lineModality = 'A distancia';
    }
    const lineType = extractSessionType(parts[3] || line);

    const hasExplicitModality = isModalityToken(parts[4] || '');
    const groupName = (hasExplicitModality ? parts[6] : parts[5] || '').trim() || 'G1';
    const teacherRaw = hasExplicitModality ? parts[7] || '' : parts[6] || '';
    const teacher =
      teacherRaw.length > 2 && !normalizeDay(teacherRaw) && !isCampusToken(teacherRaw)
        ? teacherRaw
        : 'Docente Asignado';

    const courseKey = `${courseCode}::${courseName.toUpperCase().trim()}`;
    let course = coursesMap.get(courseKey);
    if (!course) {
      const colorIndex = coursesMap.size % COURSE_COLOR_PALETTE.length;
      const stableId = `c-${slugify(courseCode || 'upc')}-${slugify(courseName)}`;
      course = {
        id: stableId,
        code: courseCode || `UPC-${100 + coursesMap.size}`,
        name: courseName,
        credits,
        cycle,
        color: COURSE_COLOR_PALETTE[colorIndex],
        sections: [],
      };
      coursesMap.set(courseKey, course);
    }

    let section = course.sections.find((s) => s.id === groupName || s.sectionName.startsWith(`${groupName} `));
    if (!section) {
      section = {
        id: groupName,
        sectionName: `NRC ${groupName} · ${lineCampus}`,
        courseCode: course.code,
        teachers: teacher ? [teacher] : [],
        vacancies: '35 / 40',
        sessions: [],
      };
      course.sections.push(section);
    } else if (teacher && !section.teachers.includes(teacher) && teacher !== 'Docente Asignado') {
      section.teachers.push(teacher);
    }

    let idx = 3;
    let sessionCount = section.sessions.length;
    while (idx < parts.length) {
      const token = parts[idx];
      if (isBlankToken(token)) {
        idx++;
        continue;
      }

      const dayCandidate = normalizeDay(token);
      if (dayCandidate && parts[idx + 1] && parts[idx + 2]) {
        const sTimeCandidate = parts[idx + 1];
        const eTimeCandidate = parts[idx + 2];
        if (/\d{1,2}[:.]\d{2}/.test(sTimeCandidate) && /\d{1,2}[:.]\d{2}/.test(eTimeCandidate)) {
          const sTime = normalizeTime(sTimeCandidate);
          const eTime = normalizeTime(eTimeCandidate);
          sessionCount += 1;
          section.sessions.push({
            id: `${groupName}-${dayCandidate}-${sTime}-${sessionCount}`,
            day: dayCandidate,
            startTime: sTime,
            endTime: eTime,
            type: lineType,
            modality: lineModality,
            campus: lineModality === 'A distancia' ? 'Online' : lineCampus,
            classroom: lineModality === 'A distancia' ? 'Aula Virtual' : '',
            teacher,
          });
          idx += 3;
          continue;
        }
      }
      idx++;
    }
  }

  return Array.from(coursesMap.values()).filter((c) => c.sections.some((s) => s.sessions.length > 0));
}

function isCampusToken(token: string): boolean {
  const clean = stripQuotes(token).toUpperCase().replace(/\s+/g, '_');
  return CAMPUS_TOKEN.test(clean) || clean === 'SAN_ISIDRO' || clean === 'SAN_MIGUEL';
}

function isModalityToken(token: string): boolean {
  return /^(PRESENCIAL|SEMIPRESENCIAL|SEMI-PRESENCIAL|VIRTUAL|ONLINE|A_DISTANCIA|A DISTANCIA|HIBRIDO|HÍBRIDO)$/i.test(
    stripQuotes(token)
  );
}

function parseSpaceSeparatedLine(line: string): string[] {
  // "1AHU 2 SEMINARIO DE INVESTIGACIÓN ACADÉMICA I TEORIA 0 1879 ANGELES LOPEZ ... MONTERRICO VIERNES 07:00 08:59"
  const tokens = line.split(/\s+/).map(stripQuotes).filter((t) => t.length > 0 || t === '');
  const compact = tokens.filter((t) => !isBlankToken(t));
  if (compact.length < 6) return compact;

  const cycleOrCode = compact[0];
  const credits = compact[1];

  let typeIndex = compact.findIndex((t) => TYPE_TOKEN.test(t));
  if (typeIndex === -1) typeIndex = 3;

  const courseName = compact.slice(2, typeIndex).join(' ');
  const type = compact[typeIndex] || 'TEORIA';
  const afterType = compact[typeIndex + 1] || '';
  const modalityOffset = isModalityToken(afterType) ? 1 : 0;
  const modality = modalityOffset ? afterType : '';
  const hours = compact[typeIndex + 1 + modalityOffset] || '0';
  const group = compact[typeIndex + 2 + modalityOffset] || 'G1';

  const remaining = compact.slice(typeIndex + 3 + modalityOffset);
  let teacherTokens: string[] = [];
  let scheduleTokens: string[] = [];

  // Cut teacher vs schedule at the campus token so names like LUIS / MARIA / JUAN
  // are not mistaken for days (LU / MA / JU).
  let campusIndex = -1;
  for (let i = 0; i < remaining.length; i++) {
    const token = remaining[i];
    const next = remaining[i + 1] || '';
    const twoTokenCampus = token.toUpperCase() === 'SAN' && /^(ISIDRO|MIGUEL)$/i.test(next);
    if (isCampusToken(token) || twoTokenCampus) {
      campusIndex = i;
      if (twoTokenCampus) {
        teacherTokens = remaining.slice(0, i);
        scheduleTokens = [`SAN_${next.toUpperCase()}`, ...remaining.slice(i + 2)];
      } else {
        teacherTokens = remaining.slice(0, i);
        scheduleTokens = remaining.slice(i);
      }
      break;
    }
  }

  if (campusIndex === -1) {
    for (let i = 0; i < remaining.length; i++) {
      const token = remaining[i];
      const next = remaining[i + 1] || '';
      const after = remaining[i + 2] || '';
      const isDay = normalizeDay(token) !== null;
      const nextIsTime = /\d{1,2}[:.]\d{2}/.test(next);
      const afterIsTime = /\d{1,2}[:.]\d{2}/.test(after);
      if (isDay && nextIsTime && afterIsTime) {
        teacherTokens = remaining.slice(0, i);
        scheduleTokens = remaining.slice(i);
        break;
      }
    }
    if (scheduleTokens.length === 0) {
      teacherTokens = remaining;
    }
  }

  return [
    cycleOrCode,
    credits,
    courseName,
    type,
    ...(modality ? [modality] : []),
    hours,
    group,
    teacherTokens.join(' '),
    ...scheduleTokens,
  ];
}

/**
 * Universal smart parser that automatically identifies format and imports courses
 */
export function parseScheduleImport(input: string): ScheduleImportResult {
  const clean = input.trim();
  if (!clean) return { courses: [] };

  if (clean.startsWith('[') || clean.startsWith('{')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
        return { courses: parsed as Course[] };
      }
      if (parsed && typeof parsed === 'object') {
        const courses = Array.isArray(parsed.courses) ? (parsed.courses as Course[]) : [];
        const selectedSections =
          parsed.selectedSections && typeof parsed.selectedSections === 'object'
            ? (parsed.selectedSections as SelectedCourseMap)
            : parsed.s && typeof parsed.s === 'object'
              ? (parsed.s as SelectedCourseMap)
              : undefined;
        if (courses.length > 0 || selectedSections) {
          return { courses, selectedSections };
        }
      }
    } catch {
      // not JSON
    }
  }

  return { courses: parseSmartSchedule(clean) };
}

export function parseSmartSchedule(input: string): Course[] {
  const clean = input.trim();
  if (!clean) return [];

  // 1. Check if valid JSON
  if (clean.startsWith('[') || clean.startsWith('{')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
        return parsed as Course[];
      }
      if (parsed.courses && Array.isArray(parsed.courses)) {
        return parsed.courses as Course[];
      }
    } catch {
      // not JSON, continue
    }
  }

  // 2. Check if UPC Banner format (contains "Tipo: Presencial" or "NRC" or "Planificar" or "de 30 lugares" or dashes format)
  if (
    clean.includes('Tipo:') ||
    clean.includes('Planificar') ||
    clean.includes('de 30') ||
    clean.includes('lugares disponibles') ||
    clean.includes('¡Restricción!') ||
    clean.includes('Métodos educativos') ||
    clean.includes('Semipresencial') ||
    clean.includes('Docentes:') ||
    clean.includes('Horarios de las clases')
  ) {
    const bannerResults = parseUPCBannerText(clean);
    if (bannerResults.length > 0) return bannerResults;
  }

  // 3. Try CSV / Table / Prompt format parser
  const csvResults = parseCSVFormat(clean);
  if (csvResults.length > 0) return csvResults;

  // Fallback to line by line banner parsing
  return parseUPCBannerText(clean);
}
