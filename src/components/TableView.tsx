import React, { useState } from 'react';
import { Course, CourseSection, DAY_NAMES, SelectedCourseMap } from '../types/schedule';
import { doSessionsOverlap } from '../utils/scheduler';
import { sessionMatchesCampusFilter, sessionMatchesModalityFilter } from '../utils/distance';
import {
  CheckCircle2,
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  Building,
  Laptop,
  MapPin,
  User,
} from 'lucide-react';

interface TableViewProps {
  courses: Course[];
  selectedSections: SelectedCourseMap;
  onSelectSection: (courseId: string, sectionId: string) => void;
  onDeselectCourse: (courseId: string) => void;
  darkMode: boolean;
}

export const TableView: React.FC<TableViewProps> = ({
  courses,
  selectedSections,
  onSelectSection,
  onDeselectCourse,
  darkMode,
}) => {
  const [search, setSearch] = useState('');
  const [filterCampus, setFilterCampus] = useState('all');
  const [filterModality, setFilterModality] = useState('all');

  // Flatten courses into sections
  const allRows: Array<{
    course: Course;
    section: CourseSection;
    isSelected: boolean;
    conflictInfo: { hasConflict: boolean; withCourse?: string };
  }> = [];

  courses.forEach((course) => {
    course.sections.forEach((section) => {
      const isSelected = selectedSections[course.id] === section.id;

      // Check conflict
      let hasConflict = false;
      let withCourse = '';

      if (!isSelected) {
        for (const otherCourse of courses) {
          if (otherCourse.id === course.id) continue;
          const otherSecId = selectedSections[otherCourse.id];
          if (!otherSecId) continue;
          const otherSec = otherCourse.sections.find((s) => s.id === otherSecId);
          if (!otherSec) continue;

          for (const s1 of section.sessions) {
            for (const s2 of otherSec.sessions) {
              if (doSessionsOverlap(s1, s2)) {
                hasConflict = true;
                withCourse = otherCourse.name;
                break;
              }
            }
            if (hasConflict) break;
          }
          if (hasConflict) break;
        }
      }

      allRows.push({
        course,
        section,
        isSelected,
        conflictInfo: { hasConflict, withCourse },
      });
    });
  });

  const filteredRows = allRows.filter(({ course, section }) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCourse = course.name.toLowerCase().includes(q);
      const matchCode = course.code.toLowerCase().includes(q);
      const matchTeacher = section.teachers.some((t) => t.toLowerCase().includes(q));
      const matchNrc = section.id.toLowerCase().includes(q);
      if (!matchCourse && !matchCode && !matchTeacher && !matchNrc) return false;
    }

    if (filterCampus !== 'all') {
      const hasCampus = section.sessions.some((s) =>
        sessionMatchesCampusFilter(s.campus, filterCampus, s.modality)
      );
      if (!hasCampus) return false;
    }

    if (filterModality !== 'all') {
      const hasModality = section.sessions.some((s) =>
        sessionMatchesModalityFilter(s.modality, s.campus, filterModality)
      );
      if (!hasModality) return false;
    }

    return true;
  });

  return (
    <div
      id="upc-banner-table-view"
      className={`rounded-2xl border shadow-xs overflow-hidden ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* Table Header Controls */}
      <div
        className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3 ${
          darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div>
          <h3 className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-100">
            Vista Tabla estilo UPC Banner (Planificar - Encontrar clases)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Periodo: 2do Semestre 2026 Pregrado • Explora vacantes, sedes y docentes
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar curso, NRC, docente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#e31e24]"
            />
          </div>

          <select
            value={filterCampus}
            onChange={(e) => setFilterCampus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#e31e24]"
          >
            <option value="all">Todas las sedes</option>
            <option value="San Isidro">San Isidro</option>
            <option value="Monterrico">Monterrico</option>
            <option value="Villa">Villa</option>
            <option value="San Miguel">San Miguel</option>
          </select>
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#e31e24]"
          >
            <option value="all">Todas las modalidades</option>
            <option value="Presencial">Presencial</option>
            <option value="Semipresencial">Semipresencial</option>
            <option value="Online">Online / Virtual</option>
          </select>
        </div>
      </div>

      {/* Structured Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse min-w-[900px]">
          <thead>
            <tr
              className={`border-b text-[11px] font-extrabold uppercase tracking-wider ${
                darkMode
                  ? 'bg-slate-800/80 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              <th className="py-3 px-4">Curso</th>
              <th className="py-3 px-3">Código</th>
              <th className="py-3 px-2 text-center">Créd.</th>
              <th className="py-3 px-3">NRC / Grupo</th>
              <th className="py-3 px-4">Docente(s)</th>
              <th className="py-3 px-4">Días, Horas & Sede</th>
              <th className="py-3 px-3">Vacantes</th>
              <th className="py-3 px-3">Modalidad</th>
              <th className="py-3 px-4 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.map(({ course, section, isSelected, conflictInfo }) => (
              <tr
                key={`${course.id}-${section.id}`}
                className={`transition-colors ${
                  isSelected
                    ? darkMode
                      ? 'bg-red-950/20'
                      : 'bg-red-50/50'
                    : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Course Name */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <div>
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">
                        {course.name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        Ciclo {course.cycle}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Code */}
                <td className="py-3 px-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                  {course.code}
                </td>

                {/* Credits */}
                <td className="py-3 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                  {course.credits}
                </td>

                {/* NRC */}
                <td className="py-3 px-3">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {section.id}
                  </span>
                </td>

                {/* Teachers (Full names without truncation) */}
                <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                  <div className="font-semibold text-xs leading-snug">
                    {section.teachers.length > 0 ? (
                      <div className="space-y-1">
                        {section.teachers.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
                            <span className="break-words">{t}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Docente UPC</span>
                    )}
                  </div>
                </td>

                {/* Sessions (Day, Full hours, Type, Sede, Aula) */}
                <td className="py-3 px-4">
                  <div className="space-y-1.5 min-w-[200px]">
                    {section.sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded border border-slate-200/60 dark:border-slate-700 font-mono"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {s.day}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {s.startTime} - {s.endTime}
                          </span>
                        </div>
                        <div className="font-sans text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">{s.type}</span>
                          <span>•</span>
                          <span>{s.campus || 'UPC'}{s.classroom ? ` (${s.classroom})` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>

                {/* Vacancies */}
                <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                  {section.vacancies || '30 / 30'}
                </td>

                {/* Modality */}
                <td className="py-3 px-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      section.sessions[0]?.modality === 'A distancia'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                        : section.sessions[0]?.modality === 'Semipresencial'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    }`}
                  >
                    {section.sessions[0]?.modality || 'Presencial'}
                  </span>
                </td>

                {/* Action button */}
                <td className="py-3 px-4 text-center">
                  {isSelected ? (
                    <button
                      onClick={() => onDeselectCourse(course.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-center gap-1 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Agregado</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectSection(course.id, section.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition shadow-xs ${
                        conflictInfo.hasConflict
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                          : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900'
                      }`}
                      title={
                        conflictInfo.hasConflict
                          ? `Generará cruce con ${conflictInfo.withCourse}`
                          : 'Agregar sección al horario'
                      }
                    >
                      {conflictInfo.hasConflict ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Agregar (Cruce)</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
