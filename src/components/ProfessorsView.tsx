import React, { useMemo, useState } from 'react';
import { Course } from '../types/schedule';
import { FaceRating, Professor, ProfessorReview } from '../types/professors';
import { hasBannedLanguage } from '../utils/reviewSafety';
import { faceEmoji, faceLabel, professorMood } from '../utils/professors';
import {
  Heart,
  Plus,
  Search,
  Smile,
  Meh,
  Frown,
  ExternalLink,
  ShieldCheck,
  X,
  GraduationCap,
} from 'lucide-react';

interface ProfessorsViewProps {
  professors: Professor[];
  courses: Course[];
  authorName: string;
  ethicsAccepted: boolean;
  onAcceptEthics: () => void;
  onToggleFavorite: (professorId: string) => void;
  onAddProfessor: (name: string, courseName: string) => void;
  onAddReview: (professorId: string, review: Omit<ProfessorReview, 'id' | 'createdAt'>) => string | null;
  darkMode: boolean;
}

const FACE_OPTIONS: Array<{ id: FaceRating; icon: React.ReactNode; label: string }> = [
  { id: 'happy', icon: <Smile className="w-4 h-4" />, label: 'Feliz' },
  { id: 'regular', icon: <Meh className="w-4 h-4" />, label: 'Regular' },
  { id: 'sad', icon: <Frown className="w-4 h-4" />, label: 'Triste' },
];

export const ProfessorsView: React.FC<ProfessorsViewProps> = ({
  professors,
  courses,
  authorName,
  ethicsAccepted,
  onAcceptEthics,
  onToggleFavorite,
  onAddProfessor,
  onAddReview,
  darkMode,
}) => {
  const [search, setSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [moodFilter, setMoodFilter] = useState<FaceRating | 'all'>('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'mid' | 'low' | 'none'>('all');
  const [showEthics, setShowEthics] = useState(!ethicsAccepted);
  const [newName, setNewName] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [reviewCourse, setReviewCourse] = useState('');
  const [reviewRating, setReviewRating] = useState<FaceRating>('happy');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const courseNames = useMemo(
    () => Array.from(new Set(courses.map((c) => c.name))).sort((a, b) => a.localeCompare(b, 'es')),
    [courses]
  );

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

  const handleAddProfessor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ethicsAccepted) {
      setShowEthics(true);
      return;
    }
    if (newName.trim().length < 4) {
      setReviewError('Escribe el nombre completo del profesor.');
      return;
    }
    if (hasBannedLanguage(`${newName} ${newCourse}`)) {
      setReviewError('Ese nombre o curso no se puede guardar. Evita insultos o lenguaje ofensivo.');
      return;
    }
    onAddProfessor(newName.trim(), newCourse.trim());
    setNewName('');
    setNewCourse('');
    setReviewError(null);
  };

  const handleAddReview = (professorId: string) => {
    if (!ethicsAccepted) {
      setShowEthics(true);
      return;
    }
    const error = onAddReview(professorId, {
      author: authorName || 'Estudiante UPC',
      courseName: reviewCourse.trim() || 'Curso no indicado',
      rating: reviewRating,
      comment: reviewComment.trim(),
    });
    if (error) {
      setReviewError(error);
      return;
    }
    setReviewFor(null);
    setReviewComment('');
    setReviewCourse('');
    setReviewRating('happy');
    setReviewError(null);
  };

  return (
    <div
      id="professors-reviews-view"
      className={`rounded-2xl border shadow-xs overflow-hidden ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {showEthics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-lg rounded-3xl border p-5 shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="font-extrabold text-base">Antes de calificar: usa respeto</h3>
            </div>
            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-2">
              <p>Estas reseñas las leen otros alumnos de la UPC. Sirven para armar horarios, no para atacar a nadie.</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Habla de la clase: claridad, exigencia, puntualidad, materiales.</li>
                <li>No insultos, groserías, apodos ofensivos ni ataques personales.</li>
                <li>Nada sexual, violento, discriminatorio o que humille al docente o a compañeros.</li>
                <li>No inventes rumores. Si no cursaste con esa persona, no publiques una reseña.</li>
              </ul>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEthics(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={() => {
                  onAcceptEthics();
                  setShowEthics(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#e31e24] text-white text-xs font-extrabold"
              >
                Acepto y califico con respeto
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`p-4 sm:p-5 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#e31e24]" />
              <h2 className="font-extrabold text-lg tracking-tight">Califica a tus profes</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Directorio de docentes UPC con promedio comunitario (feliz / regular / triste). Marca un corazón para favoritos; el catálogo y Auto ⚡ los pondrán primero si dictan ese curso.
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
      </div>

      <form
        onSubmit={handleAddProfessor}
        className="p-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del profesor"
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
        />
        <input
          value={newCourse}
          onChange={(e) => setNewCourse(e.target.value)}
          list="professor-course-options"
          placeholder="Curso que dicta (opcional)"
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
        />
        <datalist id="professor-course-options">
          {courseNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <button
          type="submit"
          className="px-3 py-2 rounded-xl bg-[#e31e24] text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar profe
        </button>
      </form>

      {reviewError && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-semibold">
          {reviewError}
        </div>
      )}

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-sm text-slate-400">
            No hay profesores con ese filtro. Agrégalos o importa un horario para detectarlos.
          </div>
        ) : (
          filtered.map((prof) => {
            const mood = professorMood(prof);
            return (
              <article
                key={prof.id}
                className={`rounded-2xl border p-3.5 flex flex-col gap-2.5 ${
                  prof.favorite
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
                    : darkMode
                      ? 'border-slate-800 bg-slate-800/40'
                      : 'border-slate-200 bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                      {prof.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {prof.courses.length > 0 ? prof.courses.slice(0, 3).join(' · ') : 'Sin curso asociado'}
                      {prof.courses.length > 3 ? ` +${prof.courses.length - 3}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(prof.id)}
                    className={`p-1.5 rounded-lg ${
                      prof.favorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                    }`}
                    title={prof.favorite ? 'Quitar de favoritos' : 'Marcar favorito'}
                  >
                    <Heart className={`w-4 h-4 ${prof.favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className="text-lg leading-none">{mood ? faceEmoji(mood) : '😶'}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    {mood ? faceLabel(mood) : 'Sin reseñas'}
                  </span>
                  {!!prof.sourceCount && !!prof.sourceAverage && (
                    <span className="text-slate-500 dark:text-slate-400">
                      · {prof.sourceAverage}/10 · {prof.sourceCount} calif. comunidad
                    </span>
                  )}
                  {prof.reviews.length > 0 && (
                    <span className="text-slate-400">· {prof.reviews.length} aquí</span>
                  )}
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {prof.reviews.slice(0, 4).map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                        <span>
                          {faceEmoji(review.rating)} {faceLabel(review.rating)} · {review.courseName}
                        </span>
                        <span className="text-slate-400 font-medium">{review.author}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>

                {reviewFor === prof.id ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 space-y-2 bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold">Nueva reseña</span>
                      <button type="button" onClick={() => setReviewFor(null)}>
                        <X className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                    <input
                      value={reviewCourse}
                      onChange={(e) => setReviewCourse(e.target.value)}
                      list="professor-course-options"
                      placeholder="¿De qué curso hablas?"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                    />
                    <div className="flex items-center gap-1">
                      {FACE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setReviewRating(opt.id)}
                          className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 ${
                            reviewRating === opt.id
                              ? opt.id === 'happy'
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : opt.id === 'sad'
                                  ? 'bg-slate-700 text-white border-slate-700'
                                  : 'bg-amber-400 text-slate-950 border-amber-400'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      rows={3}
                      placeholder="Cómo enseña, si explica bien, si es exigente... sin insultos."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddReview(prof.id)}
                      className="w-full py-1.5 rounded-lg bg-[#e31e24] text-white text-xs font-extrabold"
                    >
                      Publicar reseña
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!ethicsAccepted) {
                        setShowEthics(true);
                        return;
                      }
                      setReviewFor(prof.id);
                      setReviewCourse(prof.courses[0] || '');
                      setReviewError(null);
                    }}
                    className="mt-auto py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                  >
                    Escribir reseña
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
