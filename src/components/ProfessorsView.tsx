import React, { useEffect, useMemo, useState } from 'react';
import { Course, StudentProfile } from '../types/schedule';
import { FaceRating, Professor } from '../types/professors';
import { faceEmoji, professorMood } from '../utils/professors';
import {
  groupProfessorsByCareer,
  groupProfessorsByUserCourses,
  professorLetter,
  ProfessorGroup,
} from '../utils/professorFilters';
import {
  Heart,
  Search,
  ExternalLink,
  GraduationCap,
  BookOpen,
  Briefcase,
  LayoutGrid,
} from 'lucide-react';

const DATA_UPDATED_AT = new Date(2026, 7, 14);
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatDataDates() {
  const next = new Date(DATA_UPDATED_AT.getFullYear(), DATA_UPDATED_AT.getMonth() + 1, 1);
  return {
    updated: `${DATA_UPDATED_AT.getDate()} de ${MONTHS_ES[DATA_UPDATED_AT.getMonth()]} ${DATA_UPDATED_AT.getFullYear()}`,
    nextMonth: `${MONTHS_ES[next.getMonth()]} ${next.getFullYear()}`,
  };
}

type BrowseMode = 'all' | 'my-courses' | 'career';

interface ProfessorsViewProps {
  professors: Professor[];
  courses: Course[];
  profile: StudentProfile;
  onToggleFavorite: (professorId: string) => void;
  darkMode: boolean;
}

function ProfessorCard({
  professor,
  darkMode,
  onToggleFavorite,
}: {
  professor: Professor;
  darkMode: boolean;
  onToggleFavorite: (professorId: string) => void;
}) {
  const mood = professorMood(professor);
  return (
    <article
      className={`rounded-xl border px-3 py-2 flex items-center gap-2 ${
        professor.favorite
          ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
          : darkMode
            ? 'border-slate-800 bg-slate-800/40'
            : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      <span className="text-base leading-none w-6 text-center shrink-0">{mood ? faceEmoji(mood) : '😶'}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-extrabold text-xs text-slate-900 dark:text-white leading-snug truncate">
          {professor.name}
        </h3>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
          {professor.courses[0] || 'Sin curso'}
          {professor.sourceAverage ? ` · ${professor.sourceAverage}/10` : ''}
          {professor.sourceCount ? ` · ${professor.sourceCount} calif.` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onToggleFavorite(professor.id)}
        className={`p-1 rounded-lg shrink-0 ${
          professor.favorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
        }`}
        title={professor.favorite ? 'Quitar de favoritos' : 'Marcar favorito'}
      >
        <Heart className={`w-3.5 h-3.5 ${professor.favorite ? 'fill-current' : ''}`} />
      </button>
    </article>
  );
}

function GroupedProfessorList({
  groups,
  emptyTitle,
  emptyHint,
  darkMode,
  onToggleFavorite,
  pageSize,
  letter,
}: {
  groups: ProfessorGroup[];
  emptyTitle: string;
  emptyHint: string;
  darkMode: boolean;
  onToggleFavorite: (professorId: string) => void;
  pageSize: number;
  letter: string;
}) {
  const [visibleByGroup, setVisibleByGroup] = useState<Record<string, number>>({});

  useEffect(() => {
    setVisibleByGroup({});
  }, [pageSize, letter, groups.map((g) => g.id).join('|')]);

  if (groups.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm font-bold text-slate-500">{emptyTitle}</p>
        <p className="text-xs text-slate-400 mt-1">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {groups.map((group) => {
        const lettered = letter === 'all'
          ? group.professors
          : group.professors.filter((prof) => professorLetter(prof.name) === letter);
        const shown = visibleByGroup[group.id] ?? pageSize;
        return (
          <section key={group.id}>
            <div className="flex items-end justify-between gap-2 mb-2">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{group.title}</h3>
                {group.subtitle && (
                  <p className="text-[11px] text-slate-400 font-semibold">{group.subtitle}</p>
                )}
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {lettered.length} profe{lettered.length === 1 ? '' : 's'}
              </span>
            </div>
            {lettered.length === 0 ? (
              <div
                className={`rounded-xl border border-dashed px-4 py-4 text-xs ${
                  darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
                }`}
              >
                {group.professors.length === 0
                  ? 'Aún no hay profes de este curso en el directorio.'
                  : `No hay profes con la letra ${letter} en este bloque.`}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {lettered.slice(0, shown).map((prof) => (
                    <ProfessorCard
                      key={`${group.id}-${prof.id}`}
                      professor={prof}
                      darkMode={darkMode}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
                {lettered.length > shown && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleByGroup((prev) => ({ ...prev, [group.id]: shown + pageSize }))
                    }
                    className="mt-2 w-full py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300"
                  >
                    Ver {Math.min(pageSize, lettered.length - shown)} más ({shown} de {lettered.length})
                  </button>
                )}
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}

export const ProfessorsView: React.FC<ProfessorsViewProps> = ({
  professors,
  courses,
  profile,
  onToggleFavorite,
  darkMode,
}) => {
  const [search, setSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [browseMode, setBrowseMode] = useState<BrowseMode>('all');
  const [moodFilter, setMoodFilter] = useState<FaceRating | 'all'>('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'mid' | 'low' | 'none'>('all');
  const [letterFilter, setLetterFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(20);
  const [visibleCount, setVisibleCount] = useState(20);
  const dataDates = formatDataDates();

  const filtered = useMemo(() => {
    return professors
      .filter((prof) => {
        if (onlyFavorites && !prof.favorite) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesText =
            prof.name.toLowerCase().includes(q) ||
            prof.courses.some((course) => course.toLowerCase().includes(q));
          if (!matchesText) return false;
        }
        const mood = professorMood(prof);
        if (moodFilter !== 'all' && mood !== moodFilter) return false;
        const score = prof.sourceAverage || 0;
        if (scoreFilter === 'high' && score < 8) return false;
        if (scoreFilter === 'mid' && (score < 6 || score >= 8)) return false;
        if (scoreFilter === 'low' && (score <= 0 || score >= 6)) return false;
        if (scoreFilter === 'none' && score > 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        const scoreA = a.sourceAverage || 0;
        const scoreB = b.sourceAverage || 0;
        if (scoreFilter !== 'all' && scoreA !== scoreB) return scoreB - scoreA;
        return a.name.localeCompare(b.name, 'es');
      });
  }, [professors, onlyFavorites, search, moodFilter, scoreFilter]);

  const myCourseGroups = useMemo(
    () => groupProfessorsByUserCourses(filtered, courses),
    [filtered, courses]
  );

  const careerGroups = useMemo(
    () => groupProfessorsByCareer(filtered, profile.career),
    [filtered, profile.career]
  );

  const letterSource = useMemo(() => {
    if (browseMode === 'my-courses') return myCourseGroups.flatMap((g) => g.professors);
    if (browseMode === 'career') return careerGroups.flatMap((g) => g.professors);
    return filtered;
  }, [browseMode, myCourseGroups, careerGroups, filtered]);

  const availableLetters = useMemo(() => {
    const set = new Set(letterSource.map((prof) => professorLetter(prof.name)));
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((letter) => set.has(letter));
  }, [letterSource]);

  const letteredProfessors = useMemo(
    () =>
      letterFilter === 'all'
        ? filtered
        : filtered.filter((prof) => professorLetter(prof.name) === letterFilter),
    [filtered, letterFilter]
  );

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, letterFilter, browseMode, search, moodFilter, scoreFilter, onlyFavorites]);

  const modeButton = (id: BrowseMode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setBrowseMode(id)}
      className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 whitespace-nowrap ${
        browseMode === id
          ? 'bg-[#e31e24] text-white border-[#e31e24]'
          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      id="professors-reviews-view"
      className={`rounded-2xl border shadow-xs overflow-hidden ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      <div className={`p-4 sm:p-5 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#e31e24]" />
              <h2 className="font-extrabold text-lg tracking-tight">Califica a tus profes</h2>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Información actualizada hasta el {dataDates.updated} · Próxima actualización: {dataDates.nextMonth}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Filtra por tus cursos o por tu carrera. Marca un corazón para favoritos: el catálogo y Auto ⚡ los priorizan si dictan ese curso.
            </p>
          </div>
          <a
            href="https://peru.misprofesores.com/escuelas/UPC_1133"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ver más en MisProfesores
          </a>
        </div>

        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {modeButton('all', 'Todos', <LayoutGrid className="w-3.5 h-3.5" />)}
          {modeButton('my-courses', 'Según mis cursos', <BookOpen className="w-3.5 h-3.5" />)}
          {modeButton('career', 'Según mi carrera', <Briefcase className="w-3.5 h-3.5" />)}
        </div>
        {browseMode === 'career' && (
          <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Mostrando áreas de {profile.career || 'tu carrera'} · ciclo {profile.currentCycle}
          </p>
        )}
        {browseMode === 'my-courses' && (
          <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {courses.length > 0
              ? `${courses.length} curso${courses.length === 1 ? '' : 's'} en tu catálogo`
              : 'Aún no tienes cursos. Agrégalos o impórtalos para ver a sus profes.'}
          </p>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar profesor o curso..."
              className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
              onlyFavorites
                ? 'bg-rose-500 text-white border-rose-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-current' : ''}`} />
            Solo favoritos
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Calificación:</span>
          {([
            ['all', 'Todas'],
            ['happy', '😊 Feliz'],
            ['regular', '😐 Regular'],
            ['sad', '😞 Triste'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMoodFilter(id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border ${
                moodFilter === id
                  ? id === 'happy'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : id === 'sad'
                      ? 'bg-slate-700 text-white border-slate-700'
                      : id === 'regular'
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Puntaje:</span>
          {([
            ['all', 'Todos'],
            ['high', '8 a 10'],
            ['mid', '6 a 7.9'],
            ['low', 'Menos de 6'],
            ['none', 'Sin puntaje'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setScoreFilter(id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap border ${
                scoreFilter === id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap pl-1">
            {filtered.length} profes
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Letra:</span>
          <button
            type="button"
            onClick={() => setLetterFilter('all')}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
              letterFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Todas
          </button>
          {availableLetters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => setLetterFilter(letter)}
              className={`w-7 py-1 rounded-lg text-[11px] font-bold border ${
                letterFilter === letter
                  ? 'bg-[#e31e24] text-white border-[#e31e24]'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Mostrar:</span>
          {([10, 20, 50] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setPageSize(size)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                pageSize === size
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {browseMode === 'my-courses' ? (
        <GroupedProfessorList
          groups={myCourseGroups}
          emptyTitle="No hay cursos en tu catálogo"
          emptyHint="Agrega o importa cursos y aquí verás a los profes que los dictan, separados por curso."
          darkMode={darkMode}
          onToggleFavorite={onToggleFavorite}
          pageSize={pageSize}
          letter={letterFilter}
        />
      ) : browseMode === 'career' ? (
        <GroupedProfessorList
          groups={careerGroups}
          emptyTitle="No hay profes para esta carrera"
          emptyHint="Revisa tu perfil o cambia de carrera. También puedes buscar en Todos."
          darkMode={darkMode}
          onToggleFavorite={onToggleFavorite}
          pageSize={pageSize}
          letter={letterFilter}
        />
      ) : (
        <div className="p-4">
          {letteredProfessors.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No hay profesores con ese filtro. Prueba otra búsqueda o espera la próxima actualización.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {letteredProfessors.slice(0, visibleCount).map((prof) => (
                  <ProfessorCard
                    key={prof.id}
                    professor={prof}
                    darkMode={darkMode}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
              {letteredProfessors.length > visibleCount && (
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + pageSize)}
                  className="mt-3 w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                >
                  Ver {Math.min(pageSize, letteredProfessors.length - visibleCount)} más ({visibleCount} de {letteredProfessors.length})
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
