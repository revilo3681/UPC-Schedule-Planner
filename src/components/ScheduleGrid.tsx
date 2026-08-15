import React, { useState } from 'react';
import {
  ClassSession,
  Conflict,
  Course,
  CourseSection,
  DayOfWeek,
  DAY_NAMES,
  DAY_ORDER,
  Modality,
  SelectedCourseMap,
} from '../types/schedule';
import {
  formatTime12h,
  getActiveSessions,
  timeToMinutes,
} from '../utils/scheduler';
import {
  AlertTriangle,
  BookOpen,
  MapPin,
  User,
  Trash2,
  ExternalLink,
  Laptop,
  Building,
  Info,
} from 'lucide-react';

interface ScheduleGridProps {
  courses: Course[];
  selectedSections: SelectedCourseMap;
  conflicts: Conflict[];
  onSelectCourseSection: (courseId: string, sectionId: string) => void;
  onRemoveCourse: (courseId: string) => void;
  onClearAll: () => void;
  onInspectCourse?: (course: Course) => void;
  darkMode: boolean;
  startHour?: number; // default 7 (07:00 AM)
  endHour?: number;   // default 23 (11:00 PM)
  showSunday?: boolean;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  courses,
  selectedSections,
  conflicts,
  onSelectCourseSection,
  onRemoveCourse,
  onClearAll,
  onInspectCourse,
  darkMode,
  startHour = 7,
  endHour = 23,
  showSunday = false,
}) => {
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<{
    course: Course;
    section: CourseSection;
    session: ClassSession;
    conflictInfo?: Conflict;
  } | null>(null);

  const activeSessions = getActiveSessions(courses, selectedSections);

  const daysToRender: DayOfWeek[] = showSunday
    ? [...DAY_ORDER, 'DO']
    : DAY_ORDER;

  const totalHours = endHour - startHour;
  const hoursArray = Array.from({ length: totalHours }, (_, i) => startHour + i);

  // Group active sessions by day
  const sessionsByDay: Record<
    DayOfWeek,
    Array<{
      course: Course;
      section: CourseSection;
      session: ClassSession;
      hasConflict: boolean;
      conflictObj?: Conflict;
    }>
  > = {
    LU: [],
    MA: [],
    MI: [],
    JU: [],
    VI: [],
    SA: [],
    DO: [],
  };

  activeSessions.forEach((item) => {
    const isConflicting = conflicts.some(
      (c) =>
        (c.courseA.id === item.course.id && c.sessionA.id === item.session.id) ||
        (c.courseB.id === item.course.id && c.sessionB.id === item.session.id)
    );

    const conflictObj = conflicts.find(
      (c) =>
        (c.courseA.id === item.course.id && c.sessionA.id === item.session.id) ||
        (c.courseB.id === item.course.id && c.sessionB.id === item.session.id)
    );

    sessionsByDay[item.session.day]?.push({
      ...item,
      hasConflict: isConflicting,
      conflictObj,
    });
  });

  // Calculate top and height percentage for a session
  const getSessionPosition = (startTime: string, endTime: string) => {
    const sMin = timeToMinutes(startTime);
    const eMin = timeToMinutes(endTime);
    const gridStartMin = startHour * 60;
    const gridTotalMin = totalHours * 60;

    const top = Math.max(0, ((sMin - gridStartMin) / gridTotalMin) * 100);
    const height = Math.max(2, ((eMin - sMin) / gridTotalMin) * 100);

    return { top: `${top}%`, height: `${height}%` };
  };

  // Helper for modality icon
  const getModalityBadge = (modality: Modality) => {
    if (modality === 'A distancia' || modality === 'Virtual') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
          <Laptop className="w-2.5 h-2.5" /> Virtual
        </span>
      );
    }
    if (modality === 'Semipresencial') {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <Building className="w-2.5 h-2.5" /> Semi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
        <MapPin className="w-2.5 h-2.5" /> Presencial
      </span>
    );
  };

  // Currently selected / active courses for the right palette
  const activeEnrolledCourses = courses.filter((c) => selectedSections[c.id]);

  // Calculate total credits of selected courses
  const totalCredits = activeEnrolledCourses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div
      id="schedule-grid-container"
      className="w-full flex flex-col lg:flex-row gap-3.5 items-start"
    >
      {/* Main Timetable Box */}
      <div
        id="timetable-box"
        className={`flex-1 w-full rounded-2xl border shadow-xs overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Timetable Header Title Bar */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
            darkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50/80 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-100">
              Horario Semanal UPC
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              ({activeSessions.length} clases activas)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
              <span>Presencial (P)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Virtual (V)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e31e24] inline-block"></span>
              <span className="text-[#e31e24] dark:text-red-400 font-bold">Conflicto</span>
            </span>
          </div>
        </div>

        {/* Timetable Scrollable Grid */}
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[680px] sm:min-w-[780px]">
            {/* Day Header Columns */}
            <div
              className={`grid grid-cols-[68px_repeat(6,1fr)] border-b text-center text-xs font-bold ${
                darkMode
                  ? 'bg-slate-800/90 text-slate-200 border-slate-700'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <div className="py-2.5 px-1 border-r border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px] font-bold text-slate-400">
                Hora
              </div>
              {daysToRender.map((day) => (
                <div
                  key={day}
                  className="py-2.5 px-2 border-r last:border-r-0 border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[11px] font-bold"
                >
                  {DAY_NAMES[day]}
                </div>
              ))}
            </div>

            {/* Timetable Body (Rows + Absolute Blocks) */}
            <div className="relative grid grid-cols-[68px_repeat(6,1fr)] select-none">
              {/* Time Label Column (Left Axis) */}
              <div
                className={`border-r ${
                  darkMode
                    ? 'border-slate-800 bg-slate-900/60 text-slate-400'
                    : 'border-slate-200 bg-slate-50/50 text-slate-500'
                }`}
              >
                {hoursArray.map((hour) => {
                  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                  const label = formatTime12h(timeStr);
                  return (
                    <div
                      key={hour}
                      className={`h-14 border-b text-[11px] font-mono flex items-start justify-center pt-1.5 ${
                        darkMode ? 'border-slate-800' : 'border-slate-100'
                      }`}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

              {/* Day Columns with Hour Grid Background */}
              {daysToRender.map((day) => (
                <div
                  key={day}
                  className={`relative border-r last:border-r-0 ${
                    darkMode ? 'border-slate-800' : 'border-slate-200/80'
                  }`}
                >
                  {/* Background grid hour cells */}
                  {hoursArray.map((hour) => (
                    <div
                      key={hour}
                      className={`h-14 border-b transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                        darkMode ? 'border-slate-800/60' : 'border-slate-100'
                      }`}
                    />
                  ))}

                  {/* Render Sessions Placed on this Day */}
                  {sessionsByDay[day]?.map((item) => {
                    const pos = getSessionPosition(
                      item.session.startTime,
                      item.session.endTime
                    );
                    const isHovered = hoveredCourseId === item.course.id;

                    return (
                      <div
                        key={`${item.course.id}-${item.session.id}`}
                        style={{
                          top: pos.top,
                          height: pos.height,
                          borderColor: item.hasConflict ? '#e31e24' : item.course.color,
                          backgroundColor: item.hasConflict
                            ? (darkMode ? 'rgba(227, 30, 36, 0.32)' : 'rgba(227, 30, 36, 0.15)')
                            : (darkMode ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.96)'),
                          boxShadow: darkMode
                            ? `0 2px 10px -1px rgba(0,0,0,0.6), inset 4px 0 0 0 ${item.course.color}`
                            : `0 1px 4px rgba(0,0,0,0.06), inset 4px 0 0 0 ${item.course.color}`,
                        }}
                        onClick={() =>
                          setSelectedBlock({
                            course: item.course,
                            section: item.section,
                            session: item.session,
                            conflictInfo: item.conflictObj,
                          })
                        }
                        className={`absolute left-0.5 right-0.5 rounded-lg pl-2.5 pr-1.5 py-1 text-slate-900 dark:text-slate-100 transition-all cursor-pointer select-none overflow-hidden z-10 border flex flex-col justify-between ${
                          item.hasConflict
                            ? 'conflict-pattern conflict-border-pulse border-2 ring-3 ring-red-500/40 z-20 shadow-md text-red-950 dark:text-red-100'
                            : darkMode
                            ? 'border-slate-700 hover:border-slate-400 hover:shadow-lg'
                            : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                        } ${isHovered ? 'scale-[1.02] z-20 ring-2 ring-slate-800 dark:ring-white shadow-xl' : 'hover:brightness-105'}`}
                      >
                        {/* Subtle background color glow */}
                        <div
                          className="absolute inset-0 -z-10 pointer-events-none opacity-20 dark:opacity-25"
                          style={{
                            backgroundColor: item.hasConflict
                              ? '#e31e24'
                              : item.course.color,
                          }}
                        />

                        {/* Top Header inside card */}
                        <div className="relative">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="font-extrabold text-[11px] leading-tight line-clamp-2 text-slate-900 dark:text-slate-100">
                              {item.course.name}
                            </h4>
                            {item.hasConflict && (
                              <div
                                className="bg-[#e31e24] text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5 shrink-0"
                                title="¡Cruce detectado con otro curso!"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>CRUCE</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <span
                              className="text-[9.5px] font-bold px-1.5 py-0.2 rounded font-mono border"
                              style={{
                                backgroundColor: `${item.course.color}25`,
                                borderColor: `${item.course.color}50`,
                                color: darkMode ? '#ffffff' : item.course.color,
                              }}
                            >
                              {item.section.sectionName.split(' ')[0]}
                            </span>
                            <span className="text-[9px] font-medium text-slate-600 dark:text-slate-300">
                              {item.session.type}
                            </span>
                          </div>
                        </div>

                        {/* Middle Info: Classroom / Modality / Teacher */}
                        <div className="text-[9.5px] space-y-0.5 my-0.5 text-slate-700 dark:text-slate-200 font-medium">
                          <div className="flex items-center gap-1 truncate">
                            <User className="w-2.5 h-2.5 shrink-0 text-slate-400 dark:text-slate-400" />
                            <span className="truncate">
                              {item.session.teacher || item.section.teachers[0] || 'Docente UPC'}
                            </span>
                          </div>

                          {item.session.campus && (
                            <div className="flex items-center gap-1 truncate text-slate-600 dark:text-slate-300 text-[9px]">
                              <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400 dark:text-slate-400" />
                              <span className="truncate">
                                {item.session.campus} {item.session.classroom ? `• ${item.session.classroom}` : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bottom Time Interval */}
                        <div className="flex items-center justify-between text-[9px] font-mono font-bold pt-0.5 border-t border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                          <span>
                            {item.session.startTime} - {item.session.endTime}
                          </span>
                          <span className="text-[8.5px] uppercase font-extrabold text-[#e31e24] dark:text-red-400">
                            {item.session.modality === 'A distancia' || item.session.modality === 'Virtual' ? 'Online' : 'Presencial'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Cursos Palette & Resumen de Créditos */}
      <div
        id="courses-palette"
        className={`w-full lg:w-56 shrink-0 rounded-2xl border shadow-xs p-3.5 flex flex-col gap-3 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Credit Summary Card */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Resumen de Créditos
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {totalCredits} <span className="text-slate-400 font-normal">/ 22</span>
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#e31e24] h-full transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, (totalCredits / 22) * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
          <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Cursos Activos
          </span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {activeEnrolledCourses.length}
          </span>
        </div>

        {activeEnrolledCourses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <BookOpen className="w-7 h-7 mx-auto mb-2 opacity-40 text-slate-400" />
            <p>No has seleccionado cursos.</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Usa el catálogo a la izquierda o haz clic en <strong>Auto ⚡</strong>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-0.5">
            {activeEnrolledCourses.map((course) => {
              const selectedSecId = selectedSections[course.id];
              const sec = course.sections.find((s) => s.id === selectedSecId);
              const isHovered = hoveredCourseId === course.id;

              return (
                <div
                  key={course.id}
                  onMouseEnter={() => setHoveredCourseId(course.id)}
                  onMouseLeave={() => setHoveredCourseId(null)}
                  className={`group relative rounded-lg p-2.5 transition-all shadow-xs flex flex-col justify-between border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 border-l-4 ${
                    isHovered ? 'shadow-md bg-white dark:bg-slate-800' : 'hover:border-slate-300'
                  }`}
                  style={{ borderLeftColor: course.color }}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-extrabold text-xs leading-tight text-slate-900 dark:text-slate-100 break-words">
                        {course.name}
                      </span>
                      <button
                        onClick={() => onRemoveCourse(course.id)}
                        className="opacity-80 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition text-red-600 dark:text-red-400 shrink-0 cursor-pointer"
                        title="Quitar de mi horario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                      <span>
                        Ciclo {course.cycle} • Sección {sec?.sectionName || 'G1'}
                      </span>
                      <span className="font-bold text-[#e31e24] dark:text-red-400 font-mono">
                        {course.credits} cred
                      </span>
                    </div>

                    {/* Teacher & Sessions summary */}
                    {sec && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] space-y-1">
                        {sec.teachers.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{sec.teachers[0]}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 flex-wrap font-mono text-[9px] text-slate-500 dark:text-slate-400">
                          {sec.sessions.map((s, i) => (
                            <span key={i} className="px-1 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700/60 font-semibold">
                              {s.day} {s.startTime}-{s.endTime}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Clear All button */}
            <button
              id="clear-all-palette-btn"
              onClick={onClearAll}
              className="mt-2 w-full py-2 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              title="Limpiar todos los cursos del horario"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar horario</span>
            </button>
          </div>
        )}
      </div>

      {/* Block Inspection Modal */}
      {selectedBlock && (
        <div
          id="block-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedBlock(null)}
        >
          <div
            className={`w-full max-w-md rounded-2xl border shadow-xl p-5 ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: selectedBlock.course.color }}
                />
                <h3 className="font-extrabold text-base leading-tight">
                  {selectedBlock.course.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBlock(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {selectedBlock.conflictInfo && (
              <div className="mt-3 p-2.5 rounded-xl bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">¡Cruce de horario!</strong>
                  <span>
                    Choca con <strong>{selectedBlock.conflictInfo.courseB.name}</strong> el {DAY_NAMES[selectedBlock.session.day]} ({selectedBlock.conflictInfo.overlapStart} - {selectedBlock.conflictInfo.overlapEnd})
                  </span>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Código UPC:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{selectedBlock.course.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Sección / Grupo:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{selectedBlock.section.sectionName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Horario sesión:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                  {DAY_NAMES[selectedBlock.session.day]} {selectedBlock.session.startTime} - {selectedBlock.session.endTime} ({selectedBlock.session.type})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Docente:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedBlock.session.teacher || selectedBlock.section.teachers.join(', ')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Modalidad & Sede:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedBlock.session.modality} • {selectedBlock.session.campus || 'UPC'}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  onRemoveCourse(selectedBlock.course.id);
                  setSelectedBlock(null);
                }}
                className="px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 font-semibold text-xs transition"
              >
                Quitar curso
              </button>
              <button
                onClick={() => setSelectedBlock(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
