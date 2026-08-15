import { Course, Modality } from '../types/schedule';
import { parseSmartSchedule } from '../utils/parser';
import { RAW_UPC_SCHEDULE } from './upcRawSchedule';

/** NRC → modalidad real de Banner 2026-2 (Virtual / Semipresencial / Presencial). */
const NRC_MODALITY: Record<string, Modality> = {
  // Seminario — Virtual
  '2145': 'A distancia',
  '2183': 'A distancia',
  '2219': 'A distancia',
  '2547': 'A distancia',
  '2548': 'A distancia',
  '2557': 'A distancia',
  '2558': 'A distancia',
  '2559': 'A distancia',
  '2560': 'A distancia',
  '2583': 'A distancia',
  '2586': 'A distancia',
  '2590': 'A distancia',
  '2592': 'A distancia',
  '14635': 'A distancia',
  // Organización — Virtual
  '4175': 'A distancia',
  '4186': 'A distancia',
  '4193': 'A distancia',
  '4199': 'A distancia',
  '4233': 'A distancia',
  '4235': 'A distancia',
  '14270': 'A distancia',
  // Cálculo — Virtual
  '2960': 'A distancia',
  '2994': 'A distancia',
  '3052': 'A distancia',
  '3072': 'A distancia',
  '3082': 'A distancia',
  '3085': 'A distancia',
  // POO — Virtual
  '8010': 'A distancia',
  '8013': 'A distancia',
  // Lenguaje — Virtual
  '8991': 'A distancia',
  '8996': 'A distancia',
};

const PRESENCIAL_ONLY_COURSES = new Set(['ORGANIZACIÓN Y DIRECCIÓN DE EMPRESAS', 'LENGUAJE DE PROGRAMACIÓN']);

function applyBannerModalities(courses: Course[]): Course[] {
  return courses.map((course) => ({
    ...course,
    sections: course.sections.map((section) => {
      const mapped = NRC_MODALITY[section.id];
      const isPresencialCourse = PRESENCIAL_ONLY_COURSES.has(course.name.toUpperCase());
      const modality: Modality =
        mapped || (isPresencialCourse ? 'Presencial' : 'Semipresencial');

      if (modality === 'A distancia') {
        return {
          ...section,
          sectionName: section.sectionName.replace(/·.+$/, '· Online'),
          sessions: section.sessions.map((sess) => ({
            ...sess,
            modality: 'A distancia' as Modality,
            campus: 'Online',
            classroom: 'Aula Virtual',
          })),
        };
      }

      return {
        ...section,
        sessions: section.sessions.map((sess) => ({
          ...sess,
          modality,
          classroom: sess.classroom === 'Aula UPC' ? '' : sess.classroom,
        })),
      };
    }),
  }));
}

export const UPC_SAMPLE_COURSES: Course[] = applyBannerModalities(parseSmartSchedule(RAW_UPC_SCHEDULE));
