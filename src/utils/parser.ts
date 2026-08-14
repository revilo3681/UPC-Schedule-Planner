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

  if (d.startsWith('LU') || d.includes('LUN')) return 'LU';
  if (d.startsWith('MA') || d.includes('MAR')) return 'MA';
  if (d.startsWith('MI') || d.includes('MIÉ') || d.includes('MIE')) return 'MI';
  if (d.startsWith('JU') || d.includes('JUE')) return 'JU';
  if (d.startsWith('VI') || d.includes('VIE')) return 'VI';
  if (d.startsWith('SA') || d.includes('SÁB') || d.includes('SAB')) return 'SA';
  if (d.startsWith('DO') || d.includes('DOM')) return 'DO';

  return null;
}

export function normalizeTime(tStr: string): string {
  if (!tStr) return '07:00';
  let clean = tStr.trim().replace('.', ':');
  const parts = clean.split(':');
  if (parts.length === 1) {
    // e.g. "8" or "15" -> "08:00", "15:00"
    const h = parseInt(parts[0], 10) || 7;
    return `${h.toString().padStart(2, '0')}:00`;
  }
  const h = (parseInt(parts[0], 10) || 7).toString().padStart(2, '0');
  const m = (parseInt(parts[1], 10) || 0).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function parseRomanCycle(str: string): number {
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

/**
 * Parses free text from UPC Banner "Planificar - Encontrar Clases" table
 */
export function parseUPCBannerText(rawText: string): Course[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const coursesMap = new Map<string, Course>();

  for (const line of lines) {
    if (line.startsWith('Periodo:') || line.startsWith('El plan de') || line.startsWith('Regresar a')) {
      continue;
    }

    // Match time ranges e.g. "07:00 - 09:59" or "16:00 - 18:59"
    const timeMatch = line.match(/(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})/i);
    const dayMatches = line.match(/\b(Lun|Mar|Mié|Mie|Jue|Vie|Sáb|Sab|Dom|LU|MA|MI|JU|VI|SA|DO)\b/gi);

    // Look for NRC (usually 5 digits e.g. 15969, 15971, 15976)
    const nrcMatch = line.match(/\b(\d{4,5})\b/);
    const nrc = nrcMatch ? nrcMatch[1] : `SEC-${Math.floor(Math.random() * 9000 + 1000)}`;

    // Try to extract course name
    let courseName = 'Curso UPC';
    const cleanTokens = line.split(/\s{2,}|\t/);
    if (cleanTokens.length > 1 && cleanTokens[0].length > 3) {
      courseName = cleanTokens[0].replace(/\s*\.\.\.$/, '').trim();
    } else {
      const nameMatch = line.match(/^([A-Za-zÁÉÍÓÚáéíóúñÑ\s]+?)(?:\s+\d[A-Z]{2,4}|\s+\d{4}|\s+\d{5})/);
      if (nameMatch && nameMatch[1].length > 3) {
        courseName = nameMatch[1].trim();
      }
    }

    // Modality
    let modality: Modality = 'Presencial';
    if (/semipresencial/i.test(line)) modality = 'Semipresencial';
    else if (/a distancia|virtual|online/i.test(line)) modality = 'A distancia';

    // Campus
    let campus = 'Monterrico';
    if (/san isidro/i.test(line)) campus = 'San Isidro';
    else if (/villa/i.test(line)) campus = 'Villa';
    else if (/san miguel/i.test(line)) campus = 'San Miguel';
    else if (modality === 'A distancia') campus = 'Online';

    // Session Type
    let type: SessionType = 'Teoría';
    if (/laboratorio|lab/i.test(line)) type = 'Laboratorio';
    else if (/práctica|practica/i.test(line)) type = 'Práctica';

    // Credits
    const credMatch = line.match(/\b(\d)\s+cr[eé]d|\bcred:\s*(\d)/i);
    const credits = credMatch ? parseInt(credMatch[1] || credMatch[2], 10) : 4;

    // Days & Times
    const day = dayMatches && dayMatches.length > 0 ? normalizeDay(dayMatches[0]) || 'LU' : 'LU';
    const startTime = timeMatch ? normalizeTime(timeMatch[1]) : '08:00';
    const endTime = timeMatch ? normalizeTime(timeMatch[2]) : '10:00';

    // Teachers
    const teacherMatch = line.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+,\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/);
    const teacherName = teacherMatch ? teacherMatch[0] : 'Docente UPC';

    const courseKey = courseName.toUpperCase();
    let course = coursesMap.get(courseKey);
    if (!course) {
      const colorIndex = coursesMap.size % COURSE_COLOR_PALETTE.length;
      course = {
        id: `course-${Date.now()}-${coursesMap.size}`,
        code: `UPC-${Math.floor(Math.random() * 900 + 100)}`,
        name: courseName,
        credits: credits,
        cycle: 5,
        color: COURSE_COLOR_PALETTE[colorIndex],
        sections: [],
      };
      coursesMap.set(courseKey, course);
    }

    // Check if section exists
    let section = course.sections.find((s) => s.id === nrc);
    if (!section) {
      section = {
        id: nrc,
        sectionName: `NRC ${nrc} (${campus})`,
        courseCode: course.code,
        teachers: [teacherName],
        vacancies: '30 de 30 lugares',
        sessions: [],
      };
      course.sections.push(section);
    } else {
      if (!section.teachers.includes(teacherName) && teacherName !== 'Docente UPC') {
        section.teachers.push(teacherName);
      }
    }

    section.sessions.push({
      id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      day,
      startTime,
      endTime,
      type,
      modality,
      campus,
      teacher: teacherName,
    });
  }

  return Array.from(coursesMap.values());
}

/**
 * Parses SumPlus / ChatGPT CSV format e.g.:
 * CICLO,CREDITOS,CURSO,TIPO,HRS,GR,DOCENTE,DIA1,INICIO1,FINAL1,DIA2,INICIO2,FINAL2...
 */
export function parseCSVFormat(rawCsv: string): Course[] {
  const lines = rawCsv
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const coursesMap = new Map<string, Course>();

  for (const line of lines) {
    if (line.toLowerCase().startsWith('ciclo') || line.toLowerCase().startsWith('codigo')) {
      continue; // header
    }

    // Split by comma or semicolon or tab or multiple spaces
    let parts: string[];
    if (line.includes(',')) {
      parts = line.split(',').map((p) => p.trim());
    } else if (line.includes(';')) {
      parts = line.split(';').map((p) => p.trim());
    } else if (line.includes('\t')) {
      parts = line.split('\t').map((p) => p.trim());
    } else {
      parts = parseSpaceSeparatedLine(line);
    }

    if (parts.length < 5) continue;

    // Try to extract standard columns
    const cycle = parseRomanCycle(parts[0] || '5');
    const credits = parseInt(parts[1], 10) || 4;
    const courseName = parts[2] || 'Curso Universitario';
    const typeStr = parts[3] || 'TEORIA';
    const groupName = parts[5] || 'G1';
    let teacher = parts[6] || 'Docente Asignado';

    // Check if line mentions a campus
    let campus = 'Monterrico';
    const lineUpper = line.toUpperCase();
    if (lineUpper.includes('SAN ISIDRO') || lineUpper.includes('SAN_ISIDRO') || lineUpper.includes(' SALAVERRY')) {
      campus = 'San Isidro';
    } else if (lineUpper.includes('SAN MIGUEL') || lineUpper.includes('SAN_MIGUEL') || lineUpper.includes(' LA MARINA')) {
      campus = 'San Miguel';
    } else if (lineUpper.includes('VILLA') || lineUpper.includes('CHORRILLOS')) {
      campus = 'Villa';
    } else if (lineUpper.includes('VIRTUAL') || lineUpper.includes('ONLINE') || lineUpper.includes('A DISTANCIA')) {
      campus = 'Online';
    } else if (lineUpper.includes('MONTERRICO') || lineUpper.includes('SURCO')) {
      campus = 'Monterrico';
    }

    const sessionType: SessionType =
      typeStr.toUpperCase().includes('LAB') ? 'Laboratorio' : 'Teoría';

    const modality: Modality = campus === 'Online' ? 'A distancia' : 'Presencial';

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
        sectionName: `${groupName} (${campus})`,
        courseCode: course.code,
        teachers: teacher ? [teacher] : [],
        vacancies: '35 / 40',
        sessions: [],
      };
      course.sections.push(section);
    }

    // Now look for Day + Start + End pairs from index 7 onwards
    let idx = 7;
    while (idx < parts.length) {
      // Check if current token is a campus name (e.g. "SAN_ISIDRO")
      const tokenUpper = parts[idx].toUpperCase();
      if (tokenUpper === 'MONTERRICO' || tokenUpper === 'SAN_ISIDRO' || tokenUpper === 'SAN_MIGUEL' || tokenUpper === 'VILLA' || tokenUpper === 'ONLINE') {
        if (tokenUpper === 'SAN_ISIDRO') campus = 'San Isidro';
        else if (tokenUpper === 'SAN_MIGUEL') campus = 'San Miguel';
        else if (tokenUpper === 'VILLA') campus = 'Villa';
        else if (tokenUpper === 'ONLINE') campus = 'Online';
        else if (tokenUpper === 'MONTERRICO') campus = 'Monterrico';
        idx++;
        continue;
      }

      const dayCandidate = normalizeDay(parts[idx]);
      if (dayCandidate && parts[idx + 1] && parts[idx + 2]) {
        const sTime = normalizeTime(parts[idx + 1]);
        const eTime = normalizeTime(parts[idx + 2]);
        section.sessions.push({
          id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          day: dayCandidate,
          startTime: sTime,
          endTime: eTime,
          type: sessionType,
          modality: modality,
          campus: campus,
          teacher: teacher,
        });
        idx += 3;
      } else {
        idx++;
      }
    }
  }

  return Array.from(coursesMap.values());
}

function parseSpaceSeparatedLine(line: string): string[] {
  // Regex parsing for space-separated format:
  // "III 5 ÁLGEBRA LINEAL TEORIA 5 G1 LUNES 12:00 15:00 MARTES 12:00 14:00"
  const tokens = line.split(/\s+/);
  if (tokens.length < 6) return tokens;

  const cycle = tokens[0];
  const credits = tokens[1];

  // Find where TEORIA or LABORATORIO starts
  let typeIndex = tokens.findIndex((t) => /^(TEORIA|TEORÍA|LABORATORIO|LAB|PRÁCTICA|PRACTICA)$/i.test(t));
  if (typeIndex === -1) typeIndex = 3;

  const courseName = tokens.slice(2, typeIndex).join(' ');
  const type = tokens[typeIndex] || 'TEORIA';
  const hours = tokens[typeIndex + 1] || '4';
  const group = tokens[typeIndex + 2] || 'G1';

  // Find where days or times begin
  let remaining = tokens.slice(typeIndex + 3);
  let teacherTokens: string[] = [];
  let scheduleTokens: string[] = [];

  for (let i = 0; i < remaining.length; i++) {
    const isDay = normalizeDay(remaining[i]) !== null;
    const isTime = /\d{1,2}[:.]\d{2}/.test(remaining[i]);

    if (isDay || isTime) {
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

  // 2. Check if UPC Banner format (contains "Tipo: Presencial" or "NRC" or "Planificar" or "de 30 lugares")
  if (
    clean.includes('Tipo:') ||
    clean.includes('Planificar') ||
    clean.includes('de 30') ||
    clean.includes('¡Restricción!') ||
    clean.includes('Semipresencial')
  ) {
    const results = parseUPCBannerText(clean);
    if (results.length > 0) return results;
  }

  // 3. Try CSV / ChatGPT prompt table parser
  const csvResults = parseCSVFormat(clean);
  if (csvResults.length > 0) return csvResults;

  // Fallback to line by line banner parsing
  return parseUPCBannerText(clean);
}
