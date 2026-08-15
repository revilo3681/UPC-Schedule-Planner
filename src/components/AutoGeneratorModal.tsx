import React, { useState, useMemo } from 'react';
import {
  Course,
  DAY_NAMES,
  DAY_ORDER,
  ScheduleCombination,
  SelectedCourseMap,
} from '../types/schedule';
import {
  calculateScheduleStats,
  detectConflicts,
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
  Heart,
  Hash,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  evaluateCommute,
  LimaDistrict,
  detectInterCampusConflicts,
  getClosestCampuses,
  normalizeCampusName,
  sessionMatchesModalityFilter,
  sectionHasVacancies,
  isOnlineSession,
  UPCCampus,
} from '../utils/distance';
import { sectionHasFavoriteTeacher } from '../utils/professors';

const ALL_GENERATOR_CAMPUSES: UPCCampus[] = [
  'Monterrico',
  'San Isidro',
  'San Miguel',
  'Villa',
];

const ALL_GENERATOR_MODALITIES = ['Presencial', 'Semipresencial', 'Online'] as const;
type GeneratorModality = (typeof ALL_GENERATOR_MODALITIES)[number];

function findSectionByNrc(course: Course, nrc: string) {
  const wanted = nrc.trim();
  if (!wanted) return undefined;
  return course.sections.find((section) => section.id.trim().toLowerCase() === wanted.toLowerCase());
}

interface AutoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  currentSelectedSections: SelectedCourseMap;
  onApplyCombination: (combination: ScheduleCombination) => void;
  darkMode: boolean;
  userDistrict?: LimaDistrict;
  preferredCampus?: string;
  favoriteTeacherNames?: string[];
}

export const AutoGeneratorModal: React.FC<AutoGeneratorModalProps> = ({
  isOpen,
  onClose,
  courses,
  currentSelectedSections,
  onApplyCombination,
  darkMode,
  userDistrict = 'Santiago de Surco',
  preferredCampus,
  favoriteTeacherNames = [],
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
  const [allowedCampuses, setAllowedCampuses] = useState<UPCCampus[]>(ALL_GENERATOR_CAMPUSES);
  const [allowedModalities, setAllowedModalities] = useState<GeneratorModality[]>([
    ...ALL_GENERATOR_MODALITIES,
  ]);
  const [filterFreeFriday, setFilterFreeFriday] = useState(false);
  const [filterFreeSaturday, setFilterFreeSaturday] = useState(false);
  const [filterMaxEmptyHours, setFilterMaxEmptyHours] = useState<number | null>(null);
  const [filterOnlyVacancies, setFilterOnlyVacancies] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [courseModalities, setCourseModalities] = useState<Record<string, GeneratorModality[]>>({});
  const [lockedNrcs, setLockedNrcs] = useState<Record<string, string>>({});
  const [filterPreferFavorites, setFilterPreferFavorites] = useState(true);

  const closestCampuses = useMemo(
    () => getClosestCampuses(userDistrict, 2),
    [userDistrict]
  );

  const effectiveCampuses = useMemo<UPCCampus[]>(() => {
    if (filterPreferCloseCampus) {
      return closestCampuses;
    }
    return allowedCampuses.length === 0 ? ALL_GENERATOR_CAMPUSES : allowedCampuses;
  }, [filterPreferCloseCampus, closestCampuses, allowedCampuses]);

  const effectiveModalities = useMemo<GeneratorModality[]>(() => {
    return allowedModalities.length === 0 ? [...ALL_GENERATOR_MODALITIES] : allowedModalities;
  }, [allowedModalities]);

  const coursesForGenerator = useMemo(() => {
    return courses.map((course) => {
      const lockedSection = findSectionByNrc(course, lockedNrcs[course.id] || '');
      if ((lockedNrcs[course.id] || '').trim()) {
        return {
          ...course,
          sections: lockedSection ? [lockedSection] : [],
        };
      }
      const preferred = courseModalities[course.id];
      const modsToUse =
        preferred && preferred.length > 0 ? preferred : effectiveModalities;
      const filtered = course.sections.filter((section) => {
        if (filterOnlyVacancies && !sectionHasVacancies(section.vacancies)) return false;
        const campusOk = section.sessions.every((sess) => {
          if (isOnlineSession(sess.modality, sess.campus)) return true;
          return effectiveCampuses.includes(normalizeCampusName(sess.campus));
        });
        const modalityOk = section.sessions.every((sess) =>
          modsToUse.some((mod) =>
            sessionMatchesModalityFilter(sess.modality, sess.campus, mod)
          )
        );
        return campusOk && modalityOk;
      });
      const favoriteSections = filtered.filter((section) =>
        sectionHasFavoriteTeacher(section, favoriteTeacherNames)
      );
      return {
        ...course,
        sections:
          filterPreferFavorites && favoriteSections.length > 0 ? favoriteSections : filtered,
      };
    });
  }, [
    courses,
    effectiveCampuses,
    effectiveModalities,
    filterOnlyVacancies,
    courseModalities,
    lockedNrcs,
    filterPreferFavorites,
    favoriteTeacherNames,
  ]);

  const filteredCombinations = useMemo(() => {
    if (targetCourseIds.length === 0) return [];

    const courseNameById = (id: string) => courses.find((course) => course.id === id)?.name || id;
    const passesUiFilters = (comb: ScheduleCombination) => {
      if (filterNoConflicts && comb.stats.conflictsCount > 0) return false;
      if (filterNoInterCampusConflicts) {
        const combSessions = getActiveSessions(coursesForGenerator, comb.selectedSections);
        if (detectInterCampusConflicts(combSessions).length > 0) return false;
      }
      if (filterFreeFriday && !comb.tags.includes('Viernes libre')) return false;
      if (filterFreeSaturday && !comb.tags.includes('Sábado libre')) return false;
      if (filterMaxEmptyHours !== null && comb.stats.emptyHours > filterMaxEmptyHours) return false;
      return true;
    };
    const markPartial = (combs: ScheduleCombination[], droppedIds: string[], prefix: string) => {
      if (droppedIds.length === 0) return combs;
      const names = droppedIds.map(courseNameById);
      return combs.map((comb, index) => ({
        ...comb,
        id: `${prefix}-${comb.id}-${index}`,
        isPartial: true,
        droppedCourseNames: names,
        tags: comb.tags.includes('No caben todos') ? comb.tags : [...comb.tags, 'No caben todos'],
      }));
    };
    const sectionFits = (selected: SelectedCourseMap, courseId: string, sectionId: string) => {
      const trial = { ...selected, [courseId]: sectionId };
      if (filterNoConflicts && detectConflicts(courses, trial).length > 0) return false;
      if (filterNoInterCampusConflicts) {
        if (detectInterCampusConflicts(getActiveSessions(courses, trial)).length > 0) return false;
      }
      return true;
    };
    const scoreRelaxedSection = (section: Course['sections'][number]) => {
      let score = 0;
      if (sectionHasFavoriteTeacher(section, favoriteTeacherNames)) score += 16;
      const campusOk = section.sessions.every((sess) => {
        if (isOnlineSession(sess.modality, sess.campus)) return true;
        return effectiveCampuses.includes(normalizeCampusName(sess.campus));
      });
      if (campusOk) score += 8;
      const modalityOk = section.sessions.every((sess) =>
        effectiveModalities.some((mod) =>
          sessionMatchesModalityFilter(sess.modality, sess.campus, mod)
        )
      );
      if (modalityOk) score += 4;
      if (sectionHasVacancies(section.vacancies)) score += 2;
      return score;
    };
    const fillDroppedWithAnySection = (combs: ScheduleCombination[]) => {
      return combs.map((comb, index) => {
        const droppedIds = targetCourseIds.filter((id) => !comb.selectedSections[id]);
        if (droppedIds.length === 0) return comb;

        const selected = { ...comb.selectedSections };
        const substitutedNames: string[] = [];
        const stillDropped: string[] = [];

        for (const dropId of droppedIds) {
          const course = courses.find((c) => c.id === dropId);
          if (!course || course.sections.length === 0) {
            stillDropped.push(dropId);
            continue;
          }
          const fit = [...course.sections]
            .sort((a, b) => scoreRelaxedSection(b) - scoreRelaxedSection(a))
            .find((section) => sectionFits(selected, dropId, section.id));
          if (fit) {
            selected[dropId] = fit.id;
            substitutedNames.push(course.name);
          } else {
            stillDropped.push(dropId);
          }
        }

        if (substitutedNames.length === 0) return comb;

        const stats = calculateScheduleStats(courses, selected);
        const sessions = getActiveSessions(courses, selected).map((entry) => entry.session);
        const hasFri = sessions.some((sess) => sess.day === 'VI');
        const hasSat = sessions.some((sess) => sess.day === 'SA');
        const tags = comb.tags.filter(
          (tag) =>
            tag !== 'No caben todos' &&
            tag !== 'Viernes libre' &&
            tag !== 'Sábado libre' &&
            !/^\d+ días$/.test(tag)
        );
        if (stillDropped.length > 0 && !tags.includes('No caben todos')) tags.push('No caben todos');
        if (substitutedNames.length > 0 && !tags.includes('Sección alternativa')) {
          tags.push('Sección alternativa');
        }
        if (stats.daysCount <= 4) tags.push(`${stats.daysCount} días`);
        if (!hasFri) tags.push('Viernes libre');
        if (!hasSat) tags.push('Sábado libre');

        return {
          ...comb,
          id: `${comb.id}-alt-${index}`,
          selectedSections: selected,
          stats,
          tags,
          isPartial: stillDropped.length > 0,
          droppedCourseNames: stillDropped.map(courseNameById),
          substitutedCourseNames: substitutedNames,
        };
      });
    };
    const countFavorites = (comb: ScheduleCombination) =>
      Object.entries(comb.selectedSections).reduce((sum, [courseId, sectionId]) => {
        const course = coursesForGenerator.find((c) => c.id === courseId);
        const section = course?.sections.find((s) => s.id === sectionId);
        return section && sectionHasFavoriteTeacher(section, favoriteTeacherNames) ? sum + 1 : sum;
      }, 0);

    const withSections = targetCourseIds.filter((id) => {
      const course = coursesForGenerator.find((c) => c.id === id);
      return !!course && course.sections.length > 0;
    });
    const droppedByFilters = targetCourseIds.filter((id) => !withSections.includes(id));

    const full = generateAllCombinations(coursesForGenerator, withSections).filter(passesUiFilters);
    let results =
      droppedByFilters.length > 0 ? markPartial(full, droppedByFilters, 'missing-filter') : full;

    if (results.length === 0 && withSections.length > 1) {
      const fallbacks: ScheduleCombination[] = [];
      for (const dropId of withSections) {
        const subset = withSections.filter((id) => id !== dropId);
        const extra = generateAllCombinations(coursesForGenerator, subset).filter(passesUiFilters);
        fallbacks.push(...markPartial(extra, [...droppedByFilters, dropId], `drop-${dropId}`));
        if (fallbacks.length >= 40) break;
      }
      results = fallbacks;
    }

    results = fillDroppedWithAnySection(results);

    return results.sort((a, b) => {
      if (!!a.isPartial !== !!b.isPartial) return a.isPartial ? 1 : -1;
      const relaxedA = (a.substitutedCourseNames?.length || 0) > 0;
      const relaxedB = (b.substitutedCourseNames?.length || 0) > 0;
      if (relaxedA !== relaxedB) return relaxedA ? 1 : -1;
      const coursesA = Object.keys(a.selectedSections).length;
      const coursesB = Object.keys(b.selectedSections).length;
      if (coursesA !== coursesB) return coursesB - coursesA;
      return countFavorites(b) - countFavorites(a);
    });
  }, [
    courses,
    coursesForGenerator,
    targetCourseIds,
    filterNoConflicts,
    filterNoInterCampusConflicts,
    filterFreeFriday,
    filterFreeSaturday,
    filterMaxEmptyHours,
    favoriteTeacherNames,
    effectiveCampuses,
    effectiveModalities,
  ]);

  const toggleModality = (modality: GeneratorModality) => {
    setAllowedModalities((prev) => {
      const next = prev.includes(modality)
        ? prev.filter((m) => m !== modality)
        : [...prev, modality];
      return next;
    });
  };

  const toggleCampus = (campus: UPCCampus) => {
    setFilterPreferCloseCampus(false);
    setAllowedCampuses((prev) => {
      const next = prev.includes(campus)
        ? prev.filter((c) => c !== campus)
        : [...prev, campus];
      return next;
    });
  };

  const applyClosestCampuses = () => {
    setFilterPreferCloseCampus((prev) => {
      if (prev) {
        setAllowedCampuses(ALL_GENERATOR_CAMPUSES);
        return false;
      }
      setAllowedCampuses(closestCampuses);
      return true;
    });
  };

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

  const toggleCourseModality = (courseId: string, modality: GeneratorModality | 'all') => {
    setCourseModalities((prev) => {
      if (modality === 'all') {
        return { ...prev, [courseId]: [] };
      }
      const current = prev[courseId] || [];
      if (current.length === 0) return { ...prev, [courseId]: [modality] };
      if (current.includes(modality)) {
        return { ...prev, [courseId]: current.filter((item) => item !== modality) };
      }
      return { ...prev, [courseId]: [...current, modality] };
    });
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
            {coursesForGenerator.some((c) => targetCourseIds.includes(c.id) && c.sections.length === 0) && (
              <p className="mb-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-2.5 py-1.5">
                Alguno de los cursos no tiene secciones con las sedes, modalidades o NRC marcados. Revisa el NRC, amplía esos filtros o quita ese curso.
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {coursesForGenerator.map((c) => {
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
            {targetCourseIds.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Modalidad que quieres para cada curso:
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Elige modalidad o escribe un NRC para fijar esa sección sí o sí en todas las combinaciones.
                </p>
                {courses
                  .filter((c) => targetCourseIds.includes(c.id))
                  .map((c) => {
                    const selectedMods = courseModalities[c.id] || [];
                    const isAny = selectedMods.length === 0;
                    const lockedValue = lockedNrcs[c.id] || '';
                    const lockedSection = findSectionByNrc(c, lockedValue);
                    return (
                      <div
                        key={`mod-${c.id}`}
                        className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-2.5 py-2"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 min-w-[140px] flex-1">
                          {c.name}
                        </span>
                        <label className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1">
                          <Hash className="w-3 h-3 text-slate-400" />
                          <input
                            value={lockedValue}
                            onChange={(e) =>
                              setLockedNrcs((prev) => ({ ...prev, [c.id]: e.target.value.replace(/\D/g, '') }))
                            }
                            placeholder="NRC"
                            inputMode="numeric"
                            className="w-[72px] bg-transparent text-[11px] font-mono font-bold outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                            title="Si pones un NRC, Auto ⚡ usará esa sección en todas las combinaciones"
                          />
                        </label>
                        {lockedValue && lockedSection && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            Sí o sí · {lockedSection.sectionName}
                          </span>
                        )}
                        {lockedValue && !lockedSection && (
                          <span className="text-[10px] font-bold text-red-500">
                            NRC no está en este curso
                          </span>
                        )}
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleCourseModality(c.id, 'all')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                              isAny
                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                                : 'border-slate-200 dark:border-slate-700 text-slate-500'
                            }`}
                          >
                            Cualquiera
                          </button>
                          {ALL_GENERATOR_MODALITIES.map((modality) => {
                            const isOn = selectedMods.includes(modality);
                            return (
                              <button
                                key={modality}
                                type="button"
                                onClick={() => toggleCourseModality(c.id, modality)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                                  isOn
                                    ? modality === 'Online'
                                      ? 'bg-indigo-600 text-white border-indigo-600'
                                      : modality === 'Semipresencial'
                                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                                        : 'bg-emerald-600 text-white border-emerald-600'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                                }`}
                              >
                                {modality === 'Online' ? 'Virtual' : modality}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
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
                onClick={applyClosestCampuses}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterPreferCloseCampus
                    ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
                title={`Usa las sedes UPC más cercanas a ${userDistrict}, aunque no haya campus en tu distrito`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Sedes más cercanas a {userDistrict}</span>
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
                onClick={() => setFilterPreferFavorites(!filterPreferFavorites)}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterPreferFavorites
                    ? 'bg-rose-500 border-rose-500 text-white shadow-xs'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${filterPreferFavorites ? 'fill-current' : ''}`} />
                <span>Usar profes favoritos si dictan el curso</span>
              </button>

              <button
                onClick={() => setFilterOnlyVacancies(!filterOnlyVacancies)}
                className={`px-3 py-1.5 rounded-xl border transition flex items-center gap-1.5 ${
                  filterOnlyVacancies
                    ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Solo con vacantes</span>
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

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Modalidad que quieres usar:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {ALL_GENERATOR_MODALITIES.map((modality) => {
                  const isOn = effectiveModalities.includes(modality);
                  const style =
                    modality === 'Online'
                      ? isOn
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                        : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                      : modality === 'Semipresencial'
                        ? isOn
                          ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                        : isOn
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400';
                  return (
                    <button
                      key={modality}
                      onClick={() => toggleModality(modality)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${style}`}
                    >
                      {modality === 'Online' ? 'Online / Virtual' : modality}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                Online / Virtual no es una sede: actívalo aquí para incluir clases a distancia.
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Sedes presenciales que quieres usar:
              </span>
              {preferredCampus && ALL_GENERATOR_CAMPUSES.includes(normalizeCampusName(preferredCampus) as UPCCampus) && (
                <button
                  type="button"
                  onClick={() => {
                    const campus = normalizeCampusName(preferredCampus) as UPCCampus;
                    setFilterPreferCloseCampus(false);
                    setAllowedCampuses([campus]);
                  }}
                  className="mb-2 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-[#e31e24] dark:text-red-300 text-xs font-bold"
                >
                  Usar mi sede del perfil: {normalizeCampusName(preferredCampus)}
                </button>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {ALL_GENERATOR_CAMPUSES.map((campus) => {
                  const isOn = effectiveCampuses.includes(campus);
                  const commute = evaluateCommute(userDistrict, campus);
                  const isPreferred = normalizeCampusName(preferredCampus) === campus;
                  return (
                    <button
                      key={campus}
                      onClick={() => toggleCampus(campus)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                        isOn
                          ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900 shadow-xs'
                          : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                      } ${isPreferred ? 'ring-2 ring-[#e31e24]/50' : ''}`}
                    >
                      {campus}{isPreferred ? ' ★' : ''}
                      {commute && (
                        <span className="ml-1 font-medium opacity-80">~{commute.minutes}m</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {filterPreferCloseCampus && (
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Sedes más cercanas desde {userDistrict}:{' '}
                  {closestCampuses
                    .map((campus) => {
                      const ev = evaluateCommute(userDistrict, campus);
                      return `${campus} (~${ev.minutes} min)`;
                    })
                    .join(' y ')}
                  . Las virtuales se controlan en Modalidad. Marca otras sedes si también las quieres.
                </p>
              )}
            </div>
          </div>

          {/* Step 3: Generated Combinations Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-sm tracking-tight">
                {filteredCombinations.length} Combinaciones Encontradas
                {targetCourseIds.length > 0 && (
                  <span className="ml-2 font-semibold text-slate-500 dark:text-slate-400">
                    · {Math.max(...filteredCombinations.map((c) => Object.keys(c.selectedSections).length), 0)} de {targetCourseIds.length} cursos
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Primero las que incluyen todos tus cursos
              </span>
            </div>
            {filteredCombinations.some((comb) => comb.isPartial || (comb.substitutedCourseNames?.length || 0) > 0) && (
              <p className="mb-3 text-[11px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl px-3 py-2">
                Si un curso no cabe con tu NRC, favoritos o filtros, se busca otra sección que sí entre y se marca como alternativa.
              </p>
            )}

            {filteredCombinations.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="font-bold text-sm">No hay combinaciones con los filtros seleccionados.</p>
                <p className="text-xs text-slate-500 mt-1">
                  Prueba marcar más sedes o modalidades, desactivar Viernes/Sábado libre o quitar algún curso.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCombinations.slice(0, visibleCount).map((comb, index) => {
                  const isTopRanked = index === 0 && comb.stats.conflictsCount === 0;
                  const favoriteCount = Object.entries(comb.selectedSections).reduce((sum, [courseId, sectionId]) => {
                    const course = coursesForGenerator.find((c) => c.id === courseId);
                    const section = course?.sections.find((s) => s.id === sectionId);
                    return section && sectionHasFavoriteTeacher(section, favoriteTeacherNames)
                      ? sum + 1
                      : sum;
                  }, 0);

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
                            {favoriteCount > 0 && (
                              <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-extrabold text-[10px]">
                                <Heart className="w-3 h-3 fill-current" /> {favoriteCount} favorito{favoriteCount === 1 ? '' : 's'}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-500">
                              {Object.keys(comb.selectedSections).length}/{targetCourseIds.length} cursos
                            </span>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            {comb.tags.map((tag) => (
                              <span
                                key={tag}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  tag === 'Sin cruces'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : tag === 'Sección alternativa'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
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

                        {comb.substitutedCourseNames && comb.substitutedCourseNames.length > 0 && (
                          <p className="mt-3 text-[11px] leading-snug text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-2.5 py-2">
                            {comb.substitutedCourseNames.join(', ')} no cabía con tu combinación. Se eligió otra sección, aunque no esté en tus opciones, para que sí puedas llevarlo.
                          </p>
                        )}
                        {comb.isPartial && comb.droppedCourseNames && comb.droppedCourseNames.length > 0 && (
                          <p className="mt-3 text-[11px] leading-snug text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-2.5 py-2">
                            Ninguna sección entra sin cruces para: {comb.droppedCourseNames.join(', ')}.
                          </p>
                        )}

                        {/* Selected Sections in this combination */}
                        <div className="mt-3 space-y-1 text-xs">
                          {Object.entries(comb.selectedSections).map(([cId, secId]) => {
                            const course = courses.find((c) => c.id === cId);
                            const sec = course?.sections.find((s) => s.id === secId);
                            if (!course || !sec) return null;
                            const isSubstituted = comb.substitutedCourseNames?.includes(course.name);

                            return (
                              <div
                                key={cId}
                                className={`flex items-center justify-between gap-2 text-[11px] py-1.5 border-b ${
                                  isSubstituted
                                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 -mx-1 px-1 rounded-lg'
                                    : 'border-slate-100 dark:border-slate-800/80'
                                }`}
                              >
                                <span
                                  className={`font-semibold flex-1 leading-snug break-words ${
                                    isSubstituted
                                      ? 'text-amber-900 dark:text-amber-100'
                                      : 'text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {course.name}
                                  {isSubstituted && (
                                    <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                      Alternativa · no cabía en tu combinación
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`font-mono text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded border ${
                                    isSubstituted
                                      ? 'text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-800'
                                      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200/60 dark:border-red-900/50'
                                  }`}
                                >
                                  {sec.sectionName} · {sec.id}
                                </span>
                              </div>
                            );
                          })}
                          {comb.droppedCourseNames?.map((name) => (
                            <div
                              key={`dropped-${name}`}
                              className="flex items-center justify-between gap-2 text-[11px] py-1 border-b border-dashed border-amber-200 dark:border-amber-900/60"
                            >
                              <span className="font-semibold text-amber-800 dark:text-amber-200 flex-1 leading-snug break-words">
                                {name}
                              </span>
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                Sin sección posible
                              </span>
                            </div>
                          ))}
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
            {filteredCombinations.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + 10)}
                className="mt-3 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Ver siguientes 10 ({visibleCount} de {filteredCombinations.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
