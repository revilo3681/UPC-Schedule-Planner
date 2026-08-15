import React, { useState } from 'react';
import {
  Course,
  CourseSection,
  SelectedCourseMap,
  DAY_NAMES,
  COURSE_COLOR_PALETTE,
} from '../types/schedule';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  AlertTriangle,
  User,
  Palette,
  CheckCircle2,
  Circle,
  Filter,
  Navigation,
  Trash2,
  RotateCcw,
  Check,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import { doSessionsOverlap } from '../utils/scheduler';
import {
  evaluateCommute,
  LimaDistrict,
  getInterCampusTravelTime,
  sessionMatchesCampusFilter,
  sessionMatchesModalityFilter,
} from '../utils/distance';

function uniqueMeetings(section: CourseSection) {
  const seen = new Set<string>();
  return section.sessions.filter((sess) => {
    const key = `${sess.day}|${sess.startTime}|${sess.endTime}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sectionScheduleLabel(section: CourseSection): string {
  const meetings = uniqueMeetings(section);
  if (meetings.length === 0) return 'Sin horario';
  return meetings.map((sess) => `${sess.day} ${sess.startTime}–${sess.endTime}`).join(' · ');
}

function sectionModalityLabel(section: CourseSection): string {
  const mods = new Set(section.sessions.map((sess) => sess.modality));
  if (mods.has('A distancia') && mods.size === 1) return 'Virtual';
  if (mods.has('Virtual') && mods.size === 1) return 'Virtual';
  if (mods.has('Semipresencial') || mods.size > 1) return 'Semipresencial';
  return 'Presencial';
}

function sectionCampusLabel(section: CourseSection): string {
  const physical = section.sessions.find((sess) => sess.campus && sess.campus !== 'Online');
  return physical?.campus || section.sessions[0]?.campus || 'Online';
}

function formatClassroom(classroom?: string): string {
  if (!classroom) return '';
  return /^aula\b/i.test(classroom) ? classroom : `Aula ${classroom}`;
}

interface CourseSidebarProps {
  courses: Course[];
  selectedSections: SelectedCourseMap;
  onSelectSection: (courseId: string, sectionId: string) => void;
  onDeselectCourse: (courseId: string) => void;
  onUpdateCourseColor: (courseId: string, color: string) => void;
  onAddNewCourse: () => void;
  onDeleteCourse?: (courseId: string) => void;
  onDeleteSection?: (courseId: string, sectionId: string) => void;
  onRestoreDefaultCourses?: () => void;
  onClearCatalog?: () => void;
  currentCycle: number;
  onCycleChange?: (cycle: number) => void;
  darkMode: boolean;
  userDistrict?: LimaDistrict;
  onUndoLastChange?: () => void;
  canUndo?: boolean;
}

export const CourseSidebar: React.FC<CourseSidebarProps> = ({
  courses,
  selectedSections,
  onSelectSection,
  onDeselectCourse,
  onUpdateCourseColor,
  onAddNewCourse,
  onDeleteCourse,
  onDeleteSection,
  onRestoreDefaultCourses,
  onClearCatalog,
  currentCycle,
  onCycleChange,
  darkMode,
  userDistrict = 'Santiago de Surco',
  onUndoLastChange,
  canUndo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModality, setFilterModality] = useState<string>('all');
  const [filterCampus, setFilterCampus] = useState<string>('all');
  const selectedCycleFilter: number | 'all' = currentCycle > 0 ? currentCycle : 'all';
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingColorCourseId, setEditingColorCourseId] = useState<string | null>(null);
  const [deletedToast, setDeletedToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setDeletedToast(msg);
    setTimeout(() => {
      setDeletedToast(null);
    }, 2800);
  };

  const toggleCollapse = (courseId: string) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseId]: !prev[courseId],
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    courses.forEach((c) => {
      next[c.id] = true;
    });
    setExpandedCourses(next);
  };

  const handleCollapseAll = () => {
    setExpandedCourses({});
    setExpandedSections({});
  };

  const toggleSectionDetails = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const setCourseSectionsExpanded = (course: Course, open: boolean) => {
    setExpandedSections((prev) => {
      const next = { ...prev };
      course.sections.forEach((section) => {
        next[`${course.id}:${section.id}`] = open;
      });
      return next;
    });
  };

  const sectionMatchesFilters = (section: CourseSection) => {
    const matchesCampus = section.sessions.some((sess) =>
      sessionMatchesCampusFilter(sess.campus, filterCampus, sess.modality)
    );
    const matchesModality = section.sessions.some((sess) =>
      sessionMatchesModalityFilter(sess.modality, sess.campus, filterModality)
    );
    return matchesCampus && matchesModality;
  };

  // Filter courses, then only show sections that match sede / modalidad
  const filteredCourses = courses
    .filter((c) => {
      if (selectedCycleFilter !== 'all' && c.cycle !== selectedCycleFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        const matchTeacher = c.sections.some((s) =>
          s.teachers.some((t) => t.toLowerCase().includes(q))
        );
        if (!matchName && !matchCode && !matchTeacher) return false;
      }

      return c.sections.some(sectionMatchesFilters);
    })
    .map((c) => ({
      ...c,
      sections: c.sections.filter(sectionMatchesFilters),
    }));

  // Check if a section would produce a conflict if selected
  const wouldSectionConflict = (course: Course, section: CourseSection) => {
    for (const otherCourse of courses) {
      if (otherCourse.id === course.id) continue;
      const otherSecId = selectedSections[otherCourse.id];
      if (!otherSecId) continue;
      const otherSec = otherCourse.sections.find((s) => s.id === otherSecId);
      if (!otherSec) continue;

      for (const s1 of section.sessions) {
        for (const s2 of otherSec.sessions) {
          if (doSessionsOverlap(s1, s2)) {
            return {
              conflicts: true,
              withCourse: otherCourse.name,
              day: s1.day,
            };
          }
        }
      }
    }
    return { conflicts: false };
  };

  // Inter-campus travel warning check
  const checkInterCampusWarning = (course: Course, section: CourseSection) => {
    for (const sess of section.sessions) {
      if (!sess.campus || sess.campus === 'Online') continue;

      for (const otherCourse of courses) {
        if (otherCourse.id === course.id) continue;
        const otherSecId = selectedSections[otherCourse.id];
        if (!otherSecId) continue;
        const otherSec = otherCourse.sections.find((s) => s.id === otherSecId);
        if (!otherSec) continue;

        for (const otherSess of otherSec.sessions) {
          if (otherSess.day === sess.day && otherSess.campus && otherSess.campus !== 'Online' && otherSess.campus !== sess.campus) {
            const travelMinutes = getInterCampusTravelTime(sess.campus, otherSess.campus);
            return {
              hasCommuteIssue: true,
              msg: `Sedes distintas el ${DAY_NAMES[sess.day]}: ${sess.campus} ↔ ${otherSess.campus} (~${travelMinutes} min traslado)`,
            };
          }
        }
      }
    }
    return { hasCommuteIssue: false };
  };

  const cycleNumbers: number[] = courses
    .map((c) => Number(c.cycle))
    .filter((num) => !isNaN(num) && num > 0);
  const availableCycles: number[] = Array.from(new Set(cycleNumbers)).sort(
    (a: number, b: number) => a - b
  );

  const areAllCollapsed = courses.length > 0 && courses.every((c) => !expandedCourses[c.id]);

  return (
    <aside
      id="course-sidebar-container"
      className={`no-print w-full rounded-2xl border p-3.5 sm:p-4 flex flex-col gap-3 shadow-xs transition-colors relative ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Toast Notification */}
      {deletedToast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>✓</span>
          <span>{deletedToast}</span>
          {canUndo && onUndoLastChange && (
            <button
              type="button"
              onClick={() => {
                onUndoLastChange();
                setDeletedToast(null);
              }}
              className="underline underline-offset-2 font-extrabold"
            >
              Deshacer
            </button>
          )}
        </div>
      )}

      {/* Sidebar Header with Title & Action Controls */}
      <div className="flex flex-col gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight text-slate-800 dark:text-slate-100">
              Catálogo de Cursos & Secciones
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-[#e31e24] dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900">
              {filteredCourses.length} de {courses.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Expand / Collapse All toggle */}
            <button
              onClick={areAllCollapsed ? handleExpandAll : handleCollapseAll}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
              title={areAllCollapsed ? 'Expandir todas las secciones' : 'Plegar todos los cursos'}
            >
              <ChevronsUpDown className="w-3.5 h-3.5" />
              <span>{areAllCollapsed ? 'Expandir todo' : 'Plegar todo'}</span>
            </button>

            <button
              id="add-custom-course-btn"
              onClick={onAddNewCourse}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#e31e24] hover:bg-red-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              title="Crear un curso manualmente o importar"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo Curso</span>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por curso, código o docente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e31e24] transition"
          />
        </div>

        {/* Functional Cycle Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-0.5">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#e31e24]" />
            <span>Ciclo:</span>
          </span>
          <button
            onClick={() => onCycleChange?.(0)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCycleFilter === 'all'
                ? 'bg-[#e31e24] text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todos ({courses.length})
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cyc) => {
            const countInCycle = courses.filter((c) => c.cycle === cyc).length;
            if (countInCycle === 0 && selectedCycleFilter !== cyc) return null;
            return (
              <button
                key={cyc}
                onClick={() => onCycleChange?.(cyc)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  selectedCycleFilter === cyc
                    ? 'bg-[#e31e24] text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>C{cyc}</span>
                {countInCycle > 0 && (
                  <span className="text-[9px] opacity-80">({countInCycle})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Campus Filter Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-0.5">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Sede presencial:</span>
          {['all', 'Monterrico', 'San Isidro', 'San Miguel', 'Villa'].map((campus) => (
            <button
              key={campus}
              onClick={() => setFilterCampus(campus)}
              className={`px-2 py-0.8 rounded-md text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                filterCampus === campus
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {campus === 'all' ? 'Todas' : campus}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-0.5">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Modalidad:</span>
          {['all', 'Presencial', 'Semipresencial', 'Online'].map((mod) => (
            <button
              key={mod}
              onClick={() => setFilterModality(mod)}
              className={`px-2 py-0.8 rounded-md text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                filterModality === mod
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {mod === 'all' ? 'Todas' : mod}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 leading-snug">
          Sede filtra solo clases en campus. Las virtuales se controlan en Modalidad: con “Todas” ves presencial de esa sede y también Online.
        </p>
      </div>

      {/* Course List & Groups Accordions */}
      <div className="flex flex-col gap-3 max-h-[calc(100vh-220px)] min-h-[440px] overflow-y-auto custom-scrollbar pr-1 pb-4">
        {filteredCourses.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-3">
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              No hay cursos en el catálogo con los filtros actuales.
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {onRestoreDefaultCourses && (
                <button
                  onClick={() => {
                    onRestoreDefaultCourses();
                    showToast('Cursos UPC muestra restaurados');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#e31e24] dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar cursos UPC</span>
                </button>
              )}
              <button
                onClick={onAddNewCourse}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear o Importar</span>
              </button>
            </div>
          </div>
        ) : (
          filteredCourses.map((course) => {
            const currentSectionId = selectedSections[course.id];
            const isSelected = !!currentSectionId;
            const isCollapsed = !expandedCourses[course.id];
            const courseSectionKeys = course.sections.map((s) => `${course.id}:${s.id}`);
            const allSectionDetailsOpen =
              course.sections.length > 0 && courseSectionKeys.every((key) => !!expandedSections[key]);
            const activeSectionObj = isSelected
              ? course.sections.find((s) => s.id === currentSectionId)
              : null;

            return (
              <div
                key={course.id}
                id={`course-card-${course.id}`}
                className={`rounded-xl border transition-all ${
                  isSelected
                    ? 'border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Course Header Bar */}
                <div
                  className={`p-3 rounded-xl flex items-start justify-between gap-2.5 cursor-pointer transition select-none ${
                    isSelected
                      ? 'bg-red-50/40 dark:bg-red-950/30'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                  onClick={() => toggleCollapse(course.id)}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs ring-1 ring-black/10 mt-0.5"
                      style={{ backgroundColor: course.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 leading-snug break-words">
                          {course.name}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                          {course.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span>Ciclo {course.cycle || 1}</span>
                        <span>•</span>
                        <span>{course.credits} créditos</span>
                        <span>•</span>
                        <span>{course.sections.length} {course.sections.length === 1 ? 'sección' : 'secciones'}</span>
                        {isSelected && activeSectionObj && (
                          <span className="px-1.5 py-0.2 rounded bg-[#e31e24] text-white font-bold text-[9.5px]">
                            Secc. {activeSectionObj.sectionName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Controls */}
                  <div className="flex items-center gap-1 shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
                    {/* Color palette toggle */}
                    <button
                      onClick={() =>
                        setEditingColorCourseId(
                          editingColorCourseId === course.id ? null : course.id
                        )
                      }
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Cambiar color del curso"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete course from catalog button */}
                    {onDeleteCourse && (
                      <button
                        onClick={() => {
                          onDeleteCourse(course.id);
                          showToast(`Curso "${course.name}" eliminado`);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                        title="Eliminar curso completo del catálogo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Toggle Active status / Deselect */}
                    {isSelected && (
                      <button
                        onClick={() => onDeselectCourse(course.id)}
                        className="px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition cursor-pointer"
                        title="Quitar sección de la grilla"
                      >
                        Desactivar
                      </button>
                    )}

                    <button
                      onClick={() => toggleCollapse(course.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title={isCollapsed ? 'Desplegar secciones' : 'Plegar secciones'}
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Color Palette Popover */}
                {editingColorCourseId === course.id && (
                  <div className="px-3 py-2 border-t border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500">Color:</span>
                    {COURSE_COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          onUpdateCourseColor(course.id, color);
                          setEditingColorCourseId(null);
                        }}
                        className={`w-5 h-5 rounded-full transition-transform hover:scale-125 cursor-pointer ${
                          course.color === color ? 'ring-2 ring-red-500 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}

                {!isCollapsed && (
                  <div className="p-2.5 pt-1.5 space-y-1.5 border-t border-slate-100 dark:border-slate-800/80">
                    {course.sections.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No hay secciones registradas para este curso.
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-end px-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCourseSectionsExpanded(course, !allSectionDetailsOpen);
                            }}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition cursor-pointer"
                            title={allSectionDetailsOpen ? 'Acoplar todas las secciones' : 'Ver docente y sesiones de cada sección'}
                          >
                            <Layers className="w-3 h-3" />
                            <span>{allSectionDetailsOpen ? 'Acoplar secciones' : 'Ver detalles'}</span>
                          </button>
                        </div>
                      {course.sections.map((section) => {
                        const isSectionActive = currentSectionId === section.id;
                        const sectionKey = `${course.id}:${section.id}`;
                        const detailsOpen = !!expandedSections[sectionKey];
                        const conflictCheck = wouldSectionConflict(course, section);
                        const interCampusCheck = checkInterCampusWarning(course, section);
                        const primaryCampus = sectionCampusLabel(section);
                        const commute = evaluateCommute(userDistrict, primaryCampus);
                        const modalityLabel = sectionModalityLabel(section);

                        return (
                          <div
                            key={section.id}
                            id={`section-item-${section.id}`}
                            className={`group/sec relative rounded-xl border text-xs transition select-none ${
                              isSectionActive
                                ? 'border-[#e31e24] dark:border-red-600 bg-red-50/70 dark:bg-red-950/50 shadow-xs ring-1 ring-red-500/20'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                            }`}
                          >
                            <div
                              onClick={() => {
                                if (isSectionActive) {
                                  onDeselectCourse(course.id);
                                } else {
                                  onSelectSection(course.id, section.id);
                                }
                              }}
                              className="flex items-center justify-between gap-2 flex-wrap p-2 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isSectionActive ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#e31e24] dark:text-red-400 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100">
                                      {section.sectionName.startsWith('NRC') || section.sectionName.startsWith('Sección')
                                        ? section.sectionName
                                        : `NRC ${section.sectionName}`}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        modalityLabel === 'Virtual'
                                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                          : modalityLabel === 'Semipresencial'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      }`}
                                    >
                                      {modalityLabel}
                                    </span>
                                  </div>
                                  <p className="text-[10.5px] font-mono font-semibold text-slate-600 dark:text-slate-300 truncate">
                                    {sectionScheduleLabel(section)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {primaryCampus !== 'Online' && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-bold border flex items-center gap-0.5 ${
                                      commute.level === 'close'
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                        : commute.level === 'medium'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                        : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                                    }`}
                                    title={`Tiempo estimado desde ${userDistrict} hasta ${primaryCampus}: ~${commute.minutes} minutos`}
                                  >
                                    <span>{commute.badge}</span>
                                    <span>~{commute.minutes}m</span>
                                  </span>
                                )}
                                {primaryCampus === 'Online' && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                                    Online
                                  </span>
                                )}

                                {conflictCheck.conflicts && !isSectionActive && (
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-100 text-[#e31e24] dark:bg-red-950 dark:text-red-300 font-bold text-[9.5px] border border-red-200 dark:border-red-900">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Cruce
                                  </span>
                                )}

                                {section.vacancies && (
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {section.vacancies}
                                  </span>
                                )}

                                {onDeleteSection && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteSection(course.id, section.id);
                                      showToast(`Sección ${section.sectionName} eliminada`);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                                    title="Eliminar esta sección del curso"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSectionDetails(sectionKey);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title={detailsOpen ? 'Acoplar esta sección' : 'Ver docente y sesiones'}
                                >
                                  {detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {interCampusCheck.hasCommuteIssue && !isSectionActive && (
                              <div className="mx-2 mb-2 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-900">
                                <Navigation className="w-3 h-3 shrink-0 text-amber-600" />
                                <span>{interCampusCheck.msg}</span>
                              </div>
                            )}

                            {detailsOpen && (
                              <div className="px-2.5 pb-2.5 space-y-1.5">
                                {section.teachers.length > 0 && (
                                  <div className="p-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
                                    <div className="flex items-start gap-1.5">
                                      <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                                      <div className="flex-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 leading-snug break-words">
                                        <span className="text-[9.5px] uppercase font-bold text-slate-400 block mb-0.5">
                                          {section.teachers.length === 1 ? 'Docente:' : 'Docentes:'}
                                        </span>
                                        {section.teachers.join(', ')}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <span className="text-[9.5px] uppercase font-bold tracking-wider text-slate-400 block px-0.5">
                                  Horarios y sesiones
                                </span>
                                {uniqueMeetings(section).map((sess, idx) => (
                                  <div
                                    key={sess.id || `sess-${idx}`}
                                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/95 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-[#e31e24] dark:text-red-400 font-extrabold text-[10.5px] font-mono border border-red-200 dark:border-red-900/60">
                                          {sess.day}
                                        </span>
                                        <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100">
                                          {sess.startTime} – {sess.endTime}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                          {sess.type}
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                            sess.modality === 'A distancia' || sess.modality === 'Virtual'
                                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                              : sess.modality === 'Semipresencial'
                                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                          }`}
                                        >
                                          {sess.modality === 'A distancia' ? 'Virtual' : sess.modality}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {sess.campus || primaryCampus}
                                      </span>
                                      {sess.classroom && (
                                        <span className="font-mono">• {formatClassroom(sess.classroom)}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Catalog Bottom Management Utilities */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 gap-2">
        {onRestoreDefaultCourses && (
          <button
            onClick={() => {
              onRestoreDefaultCourses();
              showToast('Cursos muestra UPC restaurados');
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition cursor-pointer"
            title="Restablecer los cursos muestra de la UPC"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#e31e24]" />
            <span>Restaurar muestra</span>
          </button>
        )}

        {onClearCatalog && courses.length > 0 && (
          <button
            onClick={() => {
              if (!window.confirm('¿Vaciar todo el catálogo de cursos? Podrás deshacerlo.')) return;
              onClearCatalog();
              showToast('Catálogo vaciado');
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:text-red-700 transition cursor-pointer"
            title="Eliminar todos los cursos del catálogo"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar catálogo</span>
          </button>
        )}
      </div>
    </aside>
  );
};

