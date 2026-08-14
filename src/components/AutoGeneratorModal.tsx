import React, { useState, useMemo } from 'react';
import {
  Course,
  DAY_NAMES,
  DAY_ORDER,
  ScheduleCombination,
  SelectedCourseMap,
} from '../types/schedule';
import {
  generateAllCombinations,
  getActiveSessions,
  timeToMinutes,
} from '../utils/scheduler';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Award,
  Filter,
  X,
  ArrowRight,
  Flame,
  MapPin,
  Navigation,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { evaluateCommute, LimaDistrict, detectInterCampusConflicts } from '../utils/distance';

interface AutoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  currentSelectedSections: SelectedCourseMap;
  onApplyCombination: (combination: ScheduleCombination) => void;
  darkMode: boolean;
  userDistrict?: LimaDistrict;
}

export const AutoGeneratorModal: React.FC<AutoGeneratorModalProps> = ({
  isOpen,
  onClose,
  courses,
  currentSelectedSections,
  onApplyCombination,
  darkMode,
  userDistrict = 'Santiago de Surco',
}) => {
  // Courses to include in generator (default: courses that have sections)
  const [targetCourseIds, setTargetCourseIds] = useState<string[]>(() => {
    // If some courses are currently selected, use those, else use all courses with sections
    const activeIds = Object.keys(currentSelectedSections).filter(
      (id) => currentSelectedSections[id]
    );
    if (activeIds.length >= 2) return activeIds;
    return courses.slice(0, 5).map((c) => c.id);
  });

  const [filterNoConflicts, setFilterNoConflicts] = useState(true);
  const [filterNoInterCampusConflicts, setFilterNoInterCampusConflicts] = useState(true);
  const [filterPreferCloseCampus, setFilterPreferCloseCampus] = useState(false);
  const [filterFreeFriday, setFilterFreeFriday] = useState(false);
  const [filterFreeSaturday, setFilterFreeSaturday] = useState(false);
  const [filterMaxEmptyHours, setFilterMaxEmptyHours] = useState<number | null>(null);
  const [selectedCombinationId, setSelectedCombinationId] = useState<string | null>(null);

  // Generate combinations
  const allCombinations = useMemo(() => {
    if (targetCourseIds.length === 0) return [];
    return generateAllCombinations(courses, targetCourseIds);
  }, [courses, targetCourseIds]);

  // Apply UI Filters
  const filteredCombinations = useMemo(() => {
    return allCombinations.filter((comb) => {
      if (filterNoConflicts && comb.stats.conflictsCount > 0) return false;

      // Inter-campus commute check
      if (filterNoInterCampusConflicts) {
        const combSessions = getActiveSessions(courses, comb.selectedSections);
        const interConflicts = detectInterCampusConflicts(combSessions);
        if (interConflicts.length > 0) return false;
      }

      // Proximity check
      if (filterPreferCloseCampus) {
        const combSessions = getActiveSessions(courses, comb.selectedSections);
        const hasFarCampus = combSessions.some((item) => {
          if (!item.session.campus || item.session.campus === 'Online') return false;
          const ev = evaluateCommute(userDistrict, item.session.campus);
          return ev.level === 'far';
        });
        if (hasFarCampus) return false;
      }

      if (filterFreeFriday && !comb.tags.includes('Viernes libre')) return false;
      if (filterFreeSaturday && !comb.tags.includes('Sábado libre')) return false;
      if (filterMaxEmptyHours !== null && comb.stats.emptyHours > filterMaxEmptyHours) return false;
      return true;
    });
  }, [
    allCombinations,
    filterNoConflicts,
    filterNoInterCampusConflicts,
    filterPreferCloseCampus,
    filterFreeFriday,
    filterFreeSaturday,
    filterMaxEmptyHours,
    courses,
    userDistrict,
  ]);

  if (!isOpen) return null;

  const handleApply = (comb: ScheduleCombination) => {
    onApplyCombination(comb);
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
    onClose();
  };

  const toggleTargetCourse = (courseId: string) => {
    setTargetCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  return (
    <div
      id="auto-generator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-red-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center text-slate-950 font-extrabold shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg sm:text-xl tracking-tight">
                Generador Automático de Horarios ⚡
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calcula todas las combinaciones posibles de secciones y encuentra tu horario ideal sin cruces.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Controls + Results */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Step 1: Select Courses to Include */}
          <div>
            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              1. Cursos a incluir en la optimización ({targetCourseIds.length} seleccionados):
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {courses.map((c) => {
                const isChecked = targetCourseIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleTargetCourse(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                      isChecked
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name}</span>
                    <span className="opacity-70 font-mono text-[10px]">
                      ({c.sections.length} sec)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Optimization Filters */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              2. Filtros de conveniencia & Sedes:
            </span>
            <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
              <button
                onClick={() => setFilterNoConflicts(!filterNoConflicts)}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterNoConflicts
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Solo Sin Cruces (0)</span>
              </button>

              <button
                onClick={() => setFilterNoInterCampusConflicts(!filterNoInterCampusConflicts)}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterNoInterCampusConflicts
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Evitar viajes entre sedes mismo día</span>
              </button>

              <button
                onClick={() => setFilterPreferCloseCampus(!filterPreferCloseCampus)}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterPreferCloseCampus
                    ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
                title={`Excluye sedes lejanas respecto a ${userDistrict}`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Sedes cercanas a {userDistrict}</span>
              </button>

              <button
                onClick={() => setFilterFreeFriday(!filterFreeFriday)}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterFreeFriday
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Viernes Libre</span>
              </button>

              <button
                onClick={() => setFilterFreeSaturday(!filterFreeSaturday)}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterFreeSaturday
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs font-bold'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Sábado Libre</span>
              </button>

              <button
                onClick={() =>
                  setFilterMaxEmptyHours(filterMaxEmptyHours === 4 ? null : 4)
                }
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterMaxEmptyHours === 4
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Mínimos Huecos (≤ 4h)</span>
              </button>
            </div>
          </div>

          {/* Step 3: Generated Combinations Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-sm tracking-tight">
                {filteredCombinations.length} Combinaciones Encontradas
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ordenadas por eficiencia y menos huecos
              </span>
            </div>

            {filteredCombinations.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-sm">No hay combinaciones con los filtros seleccionados.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Intenta desmarcar algunos filtros (ej. Viernes libre) o cambiar los cursos objetivo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCombinations.slice(0, 10).map((comb, index) => {
                  const isTopRanked = index === 0 && comb.stats.conflictsCount === 0;

                  return (
                    <div
                      key={comb.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isTopRanked
                          ? 'border-amber-400 dark:border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-400/50'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div>
                        {/* Title & Tags */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm">
                              Opción #{index + 1}
                            </span>
                            {isTopRanked && (
                              <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px] shadow-xs">
                                <Flame className="w-3 h-3 fill-current" /> Mejor Opción
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            {comb.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  tag === 'Sin cruces'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : tag.includes('cruce')
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Metrics bar */}
                        <div className="mt-3 grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Créditos</span>
                            <span className="font-extrabold">{comb.stats.totalCredits}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Huecos</span>
                            <span className="font-extrabold text-amber-600 dark:text-amber-400">
                              {comb.stats.emptyHours}h
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Días</span>
                            <span className="font-extrabold">{comb.stats.daysCount} d</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">Eficiencia</span>
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                              {comb.stats.efficiencyScore}%
                            </span>
                          </div>
                        </div>

                        {/* Selected Sections in this combination */}
                        <div className="mt-3 space-y-1 text-xs">
                          {Object.entries(comb.selectedSections).map(([cId, secId]) => {
                            const course = courses.find((c) => c.id === cId);
                            const sec = course?.sections.find((s) => s.id === secId);
                            if (!course || !sec) return null;

                            return (
                              <div
                                key={cId}
                                className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-slate-100 dark:border-slate-800/80"
                              >
                                <span className="font-semibold text-slate-700 dark:text-slate-200 flex-1 leading-snug break-words">
                                  {course.name}
                                </span>
                                <span className="font-mono text-[10px] font-bold text-red-600 dark:text-red-400 shrink-0 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200/60 dark:border-red-900/50">
                                  {sec.sectionName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Apply button */}
                      <button
                        onClick={() => handleApply(comb)}
                        className={`mt-4 w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 ${
                          isTopRanked
                            ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md font-extrabold'
                            : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 shadow-xs'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aplicar esta combinación</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
