import {
  ClassSession,
  Course,
  CourseSection,
  COURSE_COLOR_PALETTE,
  DayOfWeek,
  Modality,
  SessionType,
} from '../types/schedule';

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

export function extractCampus(text: string, defaultCampus: string = 'Monterrico'): string {
  const upper = text.toUpperCase();
  if (upper.includes('SAN ISIDRO') || upper.includes('SAN_ISIDRO') || upper.includes('SALAVERRY')) {
    return 'San Isidro';
  }
  if (upper.includes('SAN MIGUEL') || upper.includes('SAN_MIGUEL') || upper.includes('LA MARINA')) {
    return 'San Miguel';
  }
  if (upper.includes('VILLA') || upper.includes('CHORRILLOS')) {
    return 'Villa';
  }
  if (upper.includes('MONTERRICO') || upper.includes('SURCO') || upper.includes('PRIMAVERA')) {
    return 'Monterrico';
  }
  if (upper.includes('ONLINE') || upper.includes('VIRTUAL') || upper.includes('A DISTANCIA') || upper.includes('REMOTO')) {
    return 'Online';
  }
  return defaultCampus;
}

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

/**
 * Parses free text and structured blocks from UPC Banner "Planificar - Encontrar Clases"
 */
export function parseUPCBannerText(rawText: string): Course[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const coursesMap = new Map<string, Course>();

  // Check if text is composed of Banner Blocks
  // Pattern: "Course Name - NRC - Code - Sec X"
  let currentCourseName = '';
  let currentCourseCode = '';
  let currentNrc = '';
  let currentSectionName = '';
  let currentTeacher = 'Docente UPC';
  let currentCampus = 'San Isidro';
  let currentModality: Modality = 'Presencial';
  let currentClassroom = 'Aula UPC';
  let currentType: SessionType = 'Teoría';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.startsWith('Periodo:') ||
      line.startsWith('El plan de') ||
      line.startsWith('Regresar a') ||
      line.startsWith('Buscar')
    ) {
      continue;
    }

    // Check for Banner Header line: e.g. "Programación Orientada a Objetos - 15969 - 1ASI 0781 - Sec 1"
    const headerMatch = line.match(/^(.+?)\s*-\s*(\d{4,5})\s*-\s*([A-Z0-9\s]{4,10})\s*-\s*(.+)$/i);
    if (headerMatch) {
      currentCourseName = headerMatch[1].trim();
      currentNrc = headerMatch[2].trim();
      currentCourseCode = headerMatch[3].trim();
      currentSectionName = headerMatch[4].trim();
      continue;
    }

    // Check for "Tipo: Presencial" or "Tipo: Semipresencial" or "Tipo: A distancia"
    if (/^Tipo:\s*/i.test(line)) {
      const modStr = line.replace(/^Tipo:\s*/i, '').trim();
      currentModality = extractModality(modStr);
      continue;
    }

    // Check for "Dónde: Campus San Isidro Edificio B Aula 403"
    if (/^D[oó]nde:\s*/i.test(line) || /Campus\s+[A-Za-z]+/i.test(line)) {
      currentCampus = extractCampus(line, currentCampus);
      if (currentModality === 'A distancia' && !line.toUpperCase().includes('CAMPUS')) {
        currentCampus = 'Online';
      }
      const roomMatch = line.match(/(?:Aula|Lab|Pabell[oó]n|Edificio|Room)\s+([A-Za-z0-9\s-]+)/i);
      if (roomMatch) {
        currentClassroom = roomMatch[0].trim();
      }
      continue;
    }

    // Check for "Docentes: Toledo Aller, Lourdes"
    if (/^Docentes?:\s*/i.test(line)) {
      currentTeacher = line.replace(/^Docentes?:\s*/i, '').replace(/\(Principal\)/gi, '').trim();
      continue;
    }

    // Check for Schedule lines: e.g. "Hora: 07:00 - 09:59" or "Lun, Mié | 07:00 - 09:59"
    const timeMatch = line.match(/(\d{1,2}[:.]\d{2})\s*(?:-|a|to)\s*(\d{1,2}[:.]\d{2})/i);
    const dayMatches = line.match(/\b(Lun(?:es)?|Mar(?:tes)?|Mi[eé](?:rcoles)?|Jue(?:ves)?|Vie(?:rnes)?|S[aá]b(?:ado)?|Dom(?:ingo)?|LU|MA|MI|JU|VI|SA|DO)\b/gi);

    if (timeMatch && dayMatches && dayMatches.length > 0) {
      const startTime = normalizeTime(timeMatch[1]);
      const endTime = normalizeTime(timeMatch[2]);

      // If we don't have a course name from a header, look in this line or fallback
      let courseName = currentCourseName || 'Curso UPC';
      let nrc = currentNrc;

      // Extract NRC if in line
      const inlineNrc = line.match(/\b(\d{4,5})\b/);
      if (inlineNrc && !nrc) {
        nrc = inlineNrc[1];
      }
      if (!nrc) {
        nrc = `NRC-${Math.floor(Math.random() * 9000 + 1000)}`;
      }

      // Check if line mentions modality/campus/type inline
      const lineCampus = extractCampus(line, currentCampus);
      const lineModality = extractModality(line, lineCampus);
      const lineType = extractSessionType(line);

      // Try to extract course name from tokens if not already found
      if (courseName === 'Curso UPC') {
        const cleanTokens = line.split(/\s{2,}|\t|\|/);
        if (cleanTokens.length > 1 && cleanTokens[0].length > 3) {
          courseName = cleanTokens[0].replace(/\s*\.\.\.$/, '').trim();
        } else {
          const nameMatch = line.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s+\d[A-Z]{2,4}|\s+\d{4}|\s+\d{5})/);
          if (nameMatch && nameMatch[1].length > 3) {
            courseName = nameMatch[1].trim();
          }
        }
      }

      // Teacher from line
      let teacher = currentTeacher;
      const teacherMatch = line.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+,\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/);
      if (teacherMatch) {
        teacher = teacherMatch[0];
      }

      const courseKey = courseName.toUpperCase();
      let course = coursesMap.get(courseKey);
      if (!course) {
        const colorIndex = coursesMap.size % COURSE_COLOR_PALETTE.length;
        course = {
          id: `course-${Date.now()}-${coursesMap.size}`,
          code: currentCourseCode || `UPC-${Math.floor(Math.random() * 900 + 100)}`,
          name: courseName,
          credits: 4,
          cycle: 5,
          color: COURSE_COLOR_PALETTE[colorIndex],
          sections: [],
        };
        coursesMap.set(courseKey, course);
      }

      // Find or create section
      let section = course.sections.find((s) => s.id === nrc || s.sectionName.includes(nrc));
      if (!section) {
        section = {
          id: nrc,
          sectionName: currentSectionName ? `NRC ${nrc} (${currentSectionName})` : `NRC ${nrc} (${lineCampus})`,
          courseCode: course.code,
          teachers: teacher ? [teacher] : ['Docente UPC'],
          vacancies: '30 de 30 lugares',
          sessions: [],
        };
        course.sections.push(section);
      } else {
        if (teacher && !section.teachers.includes(teacher) && teacher !== 'Docente UPC') {
          section.teachers.push(teacher);
        }
      }

      // Create session for each matched day (e.g. "Lun, Mié" -> 2 sessions for that section)
      for (const dMatch of dayMatches) {
        const day = normalizeDay(dMatch);
        if (!day) continue;

        section.sessions.push({
          id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          day,
          startTime,
          endTime,
          type: lineType || currentType,
          modality: lineModality || currentModality,
          campus: lineCampus || currentCampus,
          classroom: currentClassroom || 'Aula UPC',
          teacher: teacher || 'Docente UPC',
        });
      }
    }
  }

  return Array.from(coursesMap.values());
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
    // Skip headers
    const lower = line.toLowerCase();
    if (
      lower.startsWith('ciclo') ||
      lower.startsWith('codigo') ||
      lower.startsWith('código') ||
      lower.startsWith('curso') ||
      lower.startsWith('periodo')
    ) {
      continue;
    }

    // Delimiter detection
    let parts: string[];
    if (line.includes('|')) {
      parts = line.split('|').map((p) => p.trim());
    } else if (line.includes('\t')) {
      parts = line.split('\t').map((p) => p.trim());
    } else if (line.includes(';') || line.includes(',')) {
      const delim = line.includes(';') ? ';' : ',';
      parts = line.split(delim).map((p) => p.trim());
    } else {
      parts = parseSpaceSeparatedLine(line);
    }

    if (parts.length < 4) continue;

    // Check if line contains campus & modality keywords
    const lineCampus = extractCampus(line, 'Monterrico');
    const lineModality = extractModality(line, lineCampus);

    // Extract Cycle and Credits if present
    const cycle = parseRomanCycle(parts[0]);
    const credits = parseInt(parts[1], 10) || 4;
    const courseName = parts[2] || parts[0] || 'Curso Universitario';

    // Type detection
    const lineType = extractSessionType(line);

    // Group / NRC
    const groupName = parts[5] || parts[1] || 'G1';
    const teacher = parts[6] && parts[6].length > 3 && !normalizeDay(parts[6]) ? parts[6] : 'Docente Asignado';

    const courseKey = courseName.toUpperCase().trim();
    let course = coursesMap.get(courseKey);
    if (!course) {
      const colorIndex = coursesMap.size % COURSE_COLOR_PALETTE.length;
      course = {
        id: `c-${Date.now()}-${coursesMap.size}`,
        code: `UPC-${100 + coursesMap.size}`,
        name: courseName,
        credits: credits,
        cycle: cycle,
        color: COURSE_COLOR_PALETTE[colorIndex],
        sections: [],
      };
      coursesMap.set(courseKey, course);
    }

    let section = course.sections.find((s) => s.sectionName.includes(groupName) || s.id === groupName);
    if (!section) {
      section = {
        id: `sec-${course.id}-${groupName}`,
        sectionName: `${groupName} (${lineCampus})`,
        courseCode: course.code,
        teachers: teacher ? [teacher] : [],
        vacancies: '35 / 40',
        sessions: [],
      };
      course.sections.push(section);
    }

    // Now look for Day + Start + End pairs across the remaining tokens
    let idx = 3;
    while (idx < parts.length) {
      const token = parts[idx].trim();
      const dayCandidate = normalizeDay(token);

      if (dayCandidate && parts[idx + 1] && parts[idx + 2]) {
        const sTimeCandidate = parts[idx + 1].trim();
        const eTimeCandidate = parts[idx + 2].trim();

        if (/\d{1,2}[:.]\d{2}/.test(sTimeCandidate) && /\d{1,2}[:.]\d{2}/.test(eTimeCandidate)) {
          const sTime = normalizeTime(sTimeCandidate);
          const eTime = normalizeTime(eTimeCandidate);

          section.sessions.push({
            id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            day: dayCandidate,
            startTime: sTime,
            endTime: eTime,
            type: lineType,
            modality: lineModality,
            campus: lineCampus,
            classroom: lineModality === 'A distancia' ? 'Aula Virtual' : 'Aula UPC',
            teacher: teacher,
          });
          idx += 3;
          continue;
        }
      }
      idx++;
    }
  }

  return Array.from(coursesMap.values());
}

function parseSpaceSeparatedLine(line: string): string[] {
  // Regex parsing for space-separated format:
  // "V 5 PROGRAMACIÓN ORIENTADA A OBJETOS TEORIA 0 15969 TOLEDO ALLER LOURDES SAN_ISIDRO LUNES 07:00 10:00 MIERCOLES 07:00 10:00"
  const tokens = line.split(/\s+/);
  if (tokens.length < 6) return tokens;

  const cycle = tokens[0];
  const credits = tokens[1];

  // Find where TEORIA, LABORATORIO, PRACTICA starts
  let typeIndex = tokens.findIndex((t) => /^(TEORIA|TEORÍA|LABORATORIO|LAB|PRÁCTICA|PRACTICA)$/i.test(t));
  if (typeIndex === -1) typeIndex = 3;

  const courseName = tokens.slice(2, typeIndex).join(' ');
  const type = tokens[typeIndex] || 'TEORIA';
  const hours = tokens[typeIndex + 1] || '0';
  const group = tokens[typeIndex + 2] || 'G1';

  // Find where SEDE, DAYS or TIMES begin
  let remaining = tokens.slice(typeIndex + 3);
  let teacherTokens: string[] = [];
  let scheduleTokens: string[] = [];

  for (let i = 0; i < remaining.length; i++) {
    const isDay = normalizeDay(remaining[i]) !== null;
    const isTime = /\d{1,2}[:.]\d{2}/.test(remaining[i]);
    const isCampus = /^(MONTERRICO|SAN_ISIDRO|SAN_MIGUEL|VILLA|ONLINE|SAN|SURCO|CHORRILLOS)$/i.test(remaining[i]);

    if (isDay || isTime || isCampus) {
      scheduleTokens = remaining.slice(i);
      break;
    } else {
      teacherTokens.push(remaining[i]);
    }
  }

  return [
    cycle,
    credits,
    courseName,
    type,
    hours,
    group,
    teacherTokens.join(' '),
    ...scheduleTokens,
  ];
}

/**
 * Universal smart parser that automatically identifies format and imports courses
 */
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
    clean.includes('¡Restricción!') ||
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
