/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Course, ScheduleCombination, SelectedCourseMap, StudentProfile } from './types/schedule';
import { Professor, ProfessorReview } from './types/professors';
import { UPC_SAMPLE_COURSES } from './data/upcSampleData';
import { calculateScheduleStats, detectConflicts, getActiveSessions } from './utils/scheduler';
import { HeaderNavbar } from './components/HeaderNavbar';
import { ScheduleGrid } from './components/ScheduleGrid';
import { CourseSidebar } from './components/CourseSidebar';
import { ConflictBanner } from './components/ConflictBanner';
import { AutoGeneratorModal } from './components/AutoGeneratorModal';
import { ImportModal } from './components/ImportModal';
import { TableView } from './components/TableView';
import { ExportModal } from './components/ExportModal';
import { ProfileModal } from './components/ProfileModal';
import { ProfessorsView } from './components/ProfessorsView';
import { LimaDistrict, detectInterCampusConflicts } from './utils/distance';
import { favoriteTeacherNames, mergeProfessorLists, mergeProfessorsFromCourses, normalizePersonName } from './utils/professors';
import { UPC_PROFESSORS_SEED } from './data/upcProfessors';
import { reviewSafetyMessage } from './utils/reviewSafety';
import { decodePlanHash } from './utils/export';
import {
  Grid,
  List,
  Sparkles,
  UploadCloud,
  Download,
  X,
  FileSpreadsheet,
  Plus,
  GraduationCap,
} from 'lucide-react';

const STORAGE_KEY_COURSES = 'sumplus_upc_courses_v4';
const STORAGE_KEY_SELECTED = 'sumplus_upc_selected_v4';
const STORAGE_KEY_CYCLE = 'sumplus_upc_cycle_v4';
const STORAGE_KEY_DARK = 'sumplus_upc_dark_v1';
const STORAGE_KEY_DISTRICT = 'sumplus_upc_district_v1';
const STORAGE_KEY_PROFILE = 'sumplus_upc_profile_v4';
const STORAGE_KEY_TUTORIAL = 'sumplus_upc_hide_tutorial_v1';
const STORAGE_KEY_PROFESSORS = 'sumplus_upc_professors_v1';
const STORAGE_KEY_ETHICS = 'sumplus_upc_professor_ethics_v1';

const DEFAULT_PROFILE: StudentProfile = {
  fullName: 'Alex Rivera Campos',
  studentCode: 'u202000001',
  email: 'u202000001@upc.edu.pe',
  career: 'Ingeniería de Sistemas de Información',
  campus: 'Monterrico',
  currentCycle: 1,
  userDistrict: 'Santiago de Surco',
};

// Helper to sanitize courses safely
function sanitizeCourses(rawCourses: any[]): Course[] {
  if (!Array.isArray(rawCourses) || rawCourses.length === 0) return UPC_SAMPLE_COURSES;
  return rawCourses.map((c, cIdx) => {
    const courseId = String(c.id || `course-${cIdx}`);
    return {
      id: courseId,
      code: String(c.code || 'UPC-001'),
      name: String(c.name || 'Curso'),
      credits: Number(c.credits) || 3,
      cycle: Number(c.cycle) || 1,
      color: String(c.color || '#3b82f6'),
      sections: Array.isArray(c.sections)
        ? c.sections.map((s: any, sIdx: number) => ({
            id: String(s.id || `sec-${courseId}-${sIdx}`),
            sectionName: String(s.sectionName || `G${sIdx + 1}`),
            courseId: courseId,
            teachers: Array.isArray(s.teachers) ? s.teachers.map(String) : [],
            vacancies: s.vacancies ? String(s.vacancies) : undefined,
            sessions: Array.isArray(s.sessions)
              ? s.sessions.map((sess: any, sessIdx: number) => ({
                  id: String(sess.id || `sess-${courseId}-${sIdx}-${sessIdx}`),
                  day: sess.day || 'LU',
                  startTime: String(sess.startTime || '07:00'),
                  endTime: String(sess.endTime || '09:00'),
                  type: sess.type || 'Teoría',
                  modality: sess.modality || 'Presencial',
                  campus: sess.campus || 'San Isidro',
                  classroom: sess.classroom ? String(sess.classroom) : '',
                  teacher: sess.teacher ? String(sess.teacher) : '',
                }))
              : [],
          }))
        : [],
    };
  });
}

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DARK);
    return saved ? JSON.parse(saved) : false;
  });

  // Cycle state
  const [currentCycle, setCurrentCycle] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CYCLE);
    return saved ? parseInt(saved, 10) : 1;
  });

  // User District state for commute calculation
  const [userDistrict, setUserDistrict] = useState<LimaDistrict>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DISTRICT) as LimaDistrict | null;
    return saved || 'Santiago de Surco';
  });

  // Student Profile state
  const [profile, setProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return DEFAULT_PROFILE;
  });

  // Active View ('grid' | 'list' | 'table' | 'auto')
  const [activeView, setActiveView] = useState<'grid' | 'list' | 'table' | 'auto' | 'profes'>('grid');

  // Courses state
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_COURSES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeCourses(parsed);
        }
      } catch {
        // fallback
      }
    }
    return sanitizeCourses(UPC_SAMPLE_COURSES);
  });

  // Selected sections map { courseId: sectionId }
  const [selectedSections, setSelectedSections] = useState<SelectedCourseMap>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SELECTED);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch {
        // fallback
      }
    }
    return {};
  });

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAutoGeneratorOpen, setIsAutoGeneratorOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showTutorialBanner, setShowTutorialBanner] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_TUTORIAL) !== '1';
  });
  const [professors, setProfessors] = useState<Professor[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFESSORS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return mergeProfessorLists(UPC_PROFESSORS_SEED, parsed);
        }
      } catch {}
    }
    return mergeProfessorLists(UPC_PROFESSORS_SEED, []);
  });
  const [ethicsAccepted, setEthicsAccepted] = useState(
    () => localStorage.getItem(STORAGE_KEY_ETHICS) === '1'
  );
  const [catalogUndo, setCatalogUndo] = useState<{
    courses: Course[];
    selectedSections: SelectedCourseMap;
    label: string;
  } | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SELECTED, JSON.stringify(selectedSections));
  }, [selectedSections]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CYCLE, currentCycle.toString());
  }, [currentCycle]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DISTRICT, userDistrict);
  }, [userDistrict]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DARK, JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFESSORS, JSON.stringify(professors));
  }, [professors]);

  useEffect(() => {
    setProfessors((prev) => mergeProfessorsFromCourses(prev, courses));
  }, [courses]);

  useEffect(() => {
    if (!catalogUndo) return;
    const timer = window.setTimeout(() => setCatalogUndo(null), 8000);
    return () => window.clearTimeout(timer);
  }, [catalogUndo]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#plan=')) return;
    try {
      const parsed = decodePlanHash(hash.slice(6)) as {
        c?: Course[];
        courses?: Course[];
        s?: SelectedCourseMap;
        selectedSections?: SelectedCourseMap;
      };
      const importedCourses = parsed.c || parsed.courses;
      const importedSelected = parsed.selectedSections || parsed.s;
      if (Array.isArray(importedCourses) && importedCourses.length > 0) {
        setCourses(sanitizeCourses(importedCourses));
      }
      if (importedSelected && typeof importedSelected === 'object') {
        setSelectedSections(importedSelected);
      }
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch {
      // enlace inválido
    }
  }, []);

  const snapshotCatalog = (label: string) => {
    setCatalogUndo({
      courses,
      selectedSections,
      label,
    });
  };

  const handleUndoCatalog = () => {
    if (!catalogUndo) return;
    setCourses(catalogUndo.courses);
    setSelectedSections(catalogUndo.selectedSections);
    setCatalogUndo(null);
  };

  const hideTutorial = () => {
    setShowTutorialBanner(false);
    localStorage.setItem(STORAGE_KEY_TUTORIAL, '1');
  };

  // Compute stats and conflicts
  const stats = useMemo(() => {
    return calculateScheduleStats(courses, selectedSections);
  }, [courses, selectedSections]);

  const conflicts = useMemo(() => {
    return detectConflicts(courses, selectedSections);
  }, [courses, selectedSections]);

  // Compute inter-campus conflicts (sessions on the same day on different campuses with insufficient transit time)
  const interCampusConflicts = useMemo(() => {
    const active = getActiveSessions(courses, selectedSections);
    return detectInterCampusConflicts(active);
  }, [courses, selectedSections]);

  // Handler: Select a specific section for a course
  const handleSelectSection = (courseId: string, sectionId: string) => {
    setSelectedSections((prev) => ({
      ...prev,
      [courseId]: sectionId,
    }));
  };

  // Handler: Deselect a course
  const handleDeselectCourse = (courseId: string) => {
    setSelectedSections((prev) => {
      const copy = { ...prev };
      delete copy[courseId];
      return copy;
    });
  };

  // Handler: Remove course entirely from palette / grid selection
  const handleRemoveCourse = (courseId: string) => {
    handleDeselectCourse(courseId);
  };

  // Handler: Delete course completely from catalog and selection
  const handleDeleteCourseFromCatalog = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    snapshotCatalog(course ? `Se eliminó "${course.name}"` : 'Curso eliminado');
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    setSelectedSections((prev) => {
      const copy = { ...prev };
      delete copy[courseId];
      return copy;
    });
  };

  // Handler: Delete a specific section from a course
  const handleDeleteSectionFromCourse = (courseId: string, sectionId: string) => {
    snapshotCatalog('Sección eliminada');
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          sections: c.sections.filter((s) => s.id !== sectionId),
        };
      })
    );
    setSelectedSections((prev) => {
      if (prev[courseId] === sectionId) {
        const copy = { ...prev };
        delete copy[courseId];
        return copy;
      }
      return prev;
    });
  };

  // Handler: Restore default sample UPC courses
  const handleRestoreDefaultCourses = () => {
    setCourses(UPC_SAMPLE_COURSES);
    setSelectedSections({});
    setCurrentCycle(1);
  };

  // Handler: Clear entire catalog
  const handleClearCatalog = () => {
    snapshotCatalog('Catálogo vaciado');
    setCourses([]);
    setSelectedSections({});
  };

  // Handler: Clear all selected courses
  const handleClearAll = () => {
    setSelectedSections({});
  };

  // Handler: Update course color
  const handleUpdateCourseColor = (courseId: string, color: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, color } : c))
    );
  };

  // Handler: Save Student Profile
  const handleSaveProfile = (newProfile: StudentProfile) => {
    setProfile(newProfile);
    if (newProfile.currentCycle && newProfile.currentCycle !== currentCycle) {
      setCurrentCycle(newProfile.currentCycle);
    }
    if (newProfile.userDistrict && newProfile.userDistrict !== userDistrict) {
      setUserDistrict(newProfile.userDistrict as LimaDistrict);
    }
  };

  // Handler: Import new courses
  const handleImportCourses = (
    importedCourses: Course[],
    replaceExisting: boolean,
    importedSelected?: SelectedCourseMap
  ) => {
    if (replaceExisting) {
      setCourses(importedCourses);
      setSelectedSections(importedSelected && Object.keys(importedSelected).length > 0 ? importedSelected : {});
    } else {
      setCourses((prev) => {
        const existingNames = new Set(prev.map((c) => c.name.toLowerCase()));
        const uniqueNew = importedCourses.filter(
          (c) => !existingNames.has(c.name.toLowerCase())
        );
        return [...prev, ...uniqueNew];
      });
      if (importedSelected && Object.keys(importedSelected).length > 0) {
        setSelectedSections((prev) => ({ ...prev, ...importedSelected }));
      }
    }
  };

  // Handler: Apply generated combination from Auto ⚡
  const favoriteNames = useMemo(() => favoriteTeacherNames(professors), [professors]);

  const handleAcceptEthics = () => {
    setEthicsAccepted(true);
    localStorage.setItem(STORAGE_KEY_ETHICS, '1');
  };

  const handleToggleFavoriteProfessor = (professorId: string) => {
    setProfessors((prev) =>
      prev.map((prof) => (prof.id === professorId ? { ...prof, favorite: !prof.favorite } : prof))
    );
  };

  const handleAddProfessor = (name: string, courseName: string) => {
    setProfessors((prev) => {
      const key = normalizePersonName(name);
      if (prev.some((prof) => normalizePersonName(prof.name) === key)) {
        return prev.map((prof) =>
          normalizePersonName(prof.name) === key && courseName && !prof.courses.includes(courseName)
            ? { ...prof, courses: [...prof.courses, courseName] }
            : prof
        );
      }
      return [
        ...prev,
        {
          id: `prof-${key.replace(/\s+/g, '-')}-${Date.now()}`,
          name,
          courses: courseName ? [courseName] : [],
          favorite: false,
          reviews: [],
        },
      ];
    });
  };

  const handleAddProfessorReview = (
    professorId: string,
    review: Omit<ProfessorReview, 'id' | 'createdAt'>
  ): string | null => {
    const safety = reviewSafetyMessage(review.comment);
    if (safety) return safety;
    setProfessors((prev) =>
      prev.map((prof) =>
        prof.id === professorId
          ? {
              ...prof,
              courses:
                review.courseName && !prof.courses.includes(review.courseName)
                  ? [...prof.courses, review.courseName]
                  : prof.courses,
              reviews: [
                {
                  ...review,
                  id: `rev-${Date.now()}`,
                  createdAt: new Date().toISOString(),
                },
                ...prof.reviews,
              ],
            }
          : prof
      )
    );
    return null;
  };

  const handleApplyCombination = (comb: ScheduleCombination) => {
    setSelectedSections(comb.selectedSections);
    setActiveView('grid');
  };

  // Count active selected
  const activeSelectedCount = Object.keys(selectedSections).filter(
    (k) => selectedSections[k]
  ).length;

  return (
    <div
      className={`min-h-screen flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Navbar Header */}
      <HeaderNavbar
        currentCycle={currentCycle}
        onCycleChange={(newCycle) => {
          setCurrentCycle(newCycle);
          setProfile((prev) => ({ ...prev, currentCycle: newCycle }));
        }}
        activeView={activeView}
        onViewChange={setActiveView}
        stats={stats}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenAutoGenerator={() => setIsAutoGeneratorOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onReset={handleClearAll}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        totalCoursesCount={courses.length}
        selectedCoursesCount={activeSelectedCount}
        userDistrict={userDistrict}
        onDistrictChange={(dist) => {
          setUserDistrict(dist);
          setProfile((prev) => ({ ...prev, userDistrict: dist }));
        }}
        profile={profile}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col gap-4">
        {/* Quick Tutorial Tip Banner */}
        {showTutorialBanner && (
          <div
            id="tutorial-tip-banner"
            className={`no-print p-3.5 sm:p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-slate-200'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#e31e24] text-white shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                    ¡Bienvenido {profile.fullName.split(' ')[0]} al planificador de horarios UPC!
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/60 text-[#e31e24] dark:text-red-400 font-bold text-[10px] border border-red-200 dark:border-red-900">
                    Ciclo {currentCycle > 0 ? currentCycle : 'Todos'} • 2026-2
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                  👉 <strong>1.</strong> Selecciona una sección (G1, G2, etc.) en el catálogo para verla en tu grilla. 
                  👉 <strong>2.</strong> Puedes eliminar cursos o secciones individuales con el ícono de papelera.
                  👉 <strong>3.</strong> Haz clic en tu perfil arriba a la derecha para cambiar tu nombre, correo o carrera.
                  👉 <strong>4.</strong> Presiona <strong>"Auto ⚡"</strong> para resolver cruces automáticamente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#e31e24] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Importar / Prompt GPT</span>
              </button>
              <button
                onClick={hideTutorial}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Ocultar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Conflict & Inter-campus Warning Banner */}
        {(conflicts.length > 0 || interCampusConflicts.length > 0) && (
          <ConflictBanner
            conflicts={conflicts}
            interCampusConflicts={interCampusConflicts}
            onOpenAutoGenerator={() => setIsAutoGeneratorOpen(true)}
            darkMode={darkMode}
          />
        )}

        {/* Dynamic Views: Grid / Courses List / Table UPC Banner */}
        {activeView === 'grid' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_390px] 2xl:grid-cols-[1fr_430px] gap-4.5 items-start">
            {/* Left: Schedule Timetable Grid + Active Palette */}
            <ScheduleGrid
              courses={courses}
              selectedSections={selectedSections}
              conflicts={conflicts}
              onSelectCourseSection={handleSelectSection}
              onRemoveCourse={handleRemoveCourse}
              onClearAll={handleClearAll}
              darkMode={darkMode}
              startHour={7}
              endHour={23}
            />

            {/* Right: Interactive Course Catalog & Sections Explorer */}
            <CourseSidebar
              courses={courses}
              selectedSections={selectedSections}
              onSelectSection={handleSelectSection}
              onDeselectCourse={handleDeselectCourse}
              onUpdateCourseColor={handleUpdateCourseColor}
              onAddNewCourse={() => setIsImportOpen(true)}
              onDeleteCourse={handleDeleteCourseFromCatalog}
              onDeleteSection={handleDeleteSectionFromCourse}
              onRestoreDefaultCourses={handleRestoreDefaultCourses}
              onClearCatalog={handleClearCatalog}
              currentCycle={currentCycle}
              onCycleChange={setCurrentCycle}
              darkMode={darkMode}
              userDistrict={userDistrict}
              onUndoLastChange={handleUndoCatalog}
              canUndo={!!catalogUndo}
              favoriteTeacherNames={favoriteNames}
            />
          </div>
        )}

        {activeView === 'list' && (
          <div className="max-w-5xl mx-auto w-full">
            <CourseSidebar
              courses={courses}
              selectedSections={selectedSections}
              onSelectSection={handleSelectSection}
              onDeselectCourse={handleDeselectCourse}
              onUpdateCourseColor={handleUpdateCourseColor}
              onAddNewCourse={() => setIsImportOpen(true)}
              onDeleteCourse={handleDeleteCourseFromCatalog}
              onDeleteSection={handleDeleteSectionFromCourse}
              onRestoreDefaultCourses={handleRestoreDefaultCourses}
              onClearCatalog={handleClearCatalog}
              currentCycle={currentCycle}
              onCycleChange={setCurrentCycle}
              darkMode={darkMode}
              userDistrict={userDistrict}
              onUndoLastChange={handleUndoCatalog}
              canUndo={!!catalogUndo}
              favoriteTeacherNames={favoriteNames}
            />
          </div>
        )}

        {activeView === 'table' && (
          <TableView
            courses={courses}
            selectedSections={selectedSections}
            onSelectSection={handleSelectSection}
            onDeselectCourse={handleDeselectCourse}
            darkMode={darkMode}
          />
        )}

        {activeView === 'profes' && (
          <ProfessorsView
            professors={professors}
            courses={courses}
            authorName={profile.fullName}
            ethicsAccepted={ethicsAccepted}
            onAcceptEthics={handleAcceptEthics}
            onToggleFavorite={handleToggleFavoriteProfessor}
            onAddProfessor={handleAddProfessor}
            onAddReview={handleAddProfessorReview}
            darkMode={darkMode}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar for phones & tablets */}
      <div
        id="mobile-bottom-nav"
        className={`no-print lg:hidden sticky bottom-0 z-40 border-t px-2 py-2 flex items-center justify-around gap-0.5 ${
          darkMode
            ? 'bg-slate-900/95 border-slate-800 text-slate-300'
            : 'bg-white/95 border-slate-200 text-slate-700'
        } backdrop-blur-md`}
      >
        <button
          onClick={() => setActiveView('grid')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold ${
            activeView === 'grid'
              ? 'text-red-600 dark:text-red-400 font-extrabold'
              : 'text-slate-500'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Horario</span>
        </button>

        <button
          onClick={() => setActiveView('list')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold relative ${
            activeView === 'list'
              ? 'text-red-600 dark:text-red-400 font-extrabold'
              : 'text-slate-500'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Cursos ({activeSelectedCount})</span>
        </button>

        <button
          onClick={() => setIsAutoGeneratorOpen(true)}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-extrabold text-amber-500"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>Auto ⚡</span>
        </button>

        <button
          onClick={() => setActiveView('table')}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-[10px] font-bold ${
            activeView === 'table'
              ? 'text-red-600 dark:text-red-400 font-extrabold'
              : 'text-slate-500'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Tabla</span>
        </button>

        <button
          onClick={() => setActiveView('profes')}
          className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold ${
            activeView === 'profes' ? 'text-rose-500 font-extrabold' : 'text-slate-500'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Profes</span>
        </button>

        <button
          onClick={() => setIsImportOpen(true)}
          className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold text-slate-500"
        >
          <Plus className="w-4 h-4" />
          <span>Importar</span>
        </button>

        <button
          onClick={() => setIsExportOpen(true)}
          className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold text-slate-500"
        >
          <Download className="w-4 h-4" />
          <span>Exportar</span>
        </button>

        <button
          onClick={() => setIsProfileOpen(true)}
          className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold text-red-600 dark:text-red-400"
        >
          <div className="w-4 h-4 rounded-full bg-[#e31e24] text-white flex items-center justify-center text-[8px] font-bold">
            {profile.fullName ? profile.fullName[0] : 'U'}
          </div>
          <span>Perfil</span>
        </button>
      </div>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
        darkMode={darkMode}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportCourses={handleImportCourses}
        darkMode={darkMode}
        userDistrict={userDistrict}
      />

      <AutoGeneratorModal
        isOpen={isAutoGeneratorOpen}
        onClose={() => setIsAutoGeneratorOpen(false)}
        courses={courses}
        currentSelectedSections={selectedSections}
        onApplyCombination={handleApplyCombination}
        darkMode={darkMode}
        userDistrict={userDistrict}
        preferredCampus={profile.campus}
        favoriteTeacherNames={favoriteNames}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        courses={courses}
        selectedSections={selectedSections}
        darkMode={darkMode}
      />
    </div>
  );
}
