import { Course, DAY_ORDER, SelectedCourseMap } from '../types/schedule';
import { getActiveSessions } from './scheduler';

/**
 * Generates an iCalendar (.ics) format file for Google Calendar / Apple Calendar / Outlook
 */
export function generateICalendar(
  courses: Course[],
  selectedSections: SelectedCourseMap,
  semesterName = '2026-2 UPC'
): string {
  const active = getActiveSessions(courses, selectedSections);
  if (active.length === 0) return '';

  const dayToICalDay: Record<string, string> = {
    LU: 'MO',
    MA: 'TU',
    MI: 'WE',
    JU: 'TH',
    VI: 'FR',
    SA: 'SA',
    DO: 'SU',
  };

  // Base date: Monday of semester start (e.g. March 16, 2026)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dtStamp = `${year}${month}${day}T000000Z`;

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SumPlus UPC//Planificador de Horarios//ES',
    `X-WR-CALNAME:Horario ${semesterName}`,
    'X-WR-TIMEZONE:America/Lima',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  active.forEach(({ course, section, session }) => {
    const sH = session.startTime.split(':')[0].padStart(2, '0');
    const sM = session.startTime.split(':')[1] || '00';
    const eH = session.endTime.split(':')[0].padStart(2, '0');
    const eM = session.endTime.split(':')[1] || '00';

    const byDay = dayToICalDay[session.day] || 'MO';
    const summary = `${course.name} (${session.type}) - ${section.sectionName}`;
    const location = `${session.campus || 'UPC'} ${session.classroom ? '- ' + session.classroom : ''} [${session.modality}]`;
    const description = `Docente: ${session.teacher || section.teachers.join(', ')}\\nCréditos: ${course.credits}\\nCódigo: ${course.code}`;

    ics.push(
      'BEGIN:VEVENT',
      `UID:${session.id}@sumplus-upc`,
      `DTSTAMP:${dtStamp}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay};COUNT=16`,
      `DTSTART;TZID=America/Lima:20260316T${sH}${sM}00`,
      `DTEND;TZID=America/Lima:20260316T${eH}${eM}00`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportScheduleAsICS(
  courses: Course[],
  selectedSections: SelectedCourseMap
) {
  const icsData = generateICalendar(courses, selectedSections);
  if (!icsData) return;
  downloadFile(icsData, 'Horario_UPC_2026.ics', 'text/calendar;charset=utf-8');
}

export function exportScheduleAsJSON(
  courses: Course[],
  selectedSections: SelectedCourseMap
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    selectedSections,
    courses,
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    'Horario_UPC_backup.json',
    'application/json'
  );
}
