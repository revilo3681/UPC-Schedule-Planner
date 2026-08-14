import React from 'react';
import { Conflict, DAY_NAMES } from '../types/schedule';
import { InterCampusConflict } from '../utils/distance';
import { Sparkles, ArrowRight, ShieldAlert, Navigation } from 'lucide-react';

interface ConflictBannerProps {
  conflicts: Conflict[];
  interCampusConflicts?: InterCampusConflict[];
  onOpenAutoGenerator: () => void;
  darkMode: boolean;
}

export const ConflictBanner: React.FC<ConflictBannerProps> = ({
  conflicts,
  interCampusConflicts = [],
  onOpenAutoGenerator,
  darkMode,
}) => {
  if (conflicts.length === 0 && interCampusConflicts.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Time Overlap Conflicts */}
      {conflicts.length > 0 && (
        <div
          id="conflicts-alert-banner"
          className={`w-full rounded-2xl border shadow-xs p-3.5 transition-all animate-in slide-in-from-bottom-2 ${
            darkMode ? 'bg-red-950/40 border-red-800/80 text-red-200' : 'bg-red-50/70 border-red-200 text-red-900'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#e31e24] text-white shrink-0 shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-tight text-[#e31e24] dark:text-red-400">
                    ¡Cruces de Horario Detectados! ({conflicts.length})
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-[#e31e24] dark:text-red-300">
                    Conflicto de Matrícula
                  </span>
                </div>

                {/* List of Colliding pairs */}
                <div className="mt-1.5 space-y-1 text-xs">
                  {conflicts.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 flex-wrap text-slate-800 dark:text-slate-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e31e24] shrink-0"></span>
                      <span className="font-bold">{c.courseA.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({c.sectionA.sectionName})
                      </span>
                      <span className="text-[#e31e24] font-extrabold">⚡ CHOCA CON ⚡</span>
                      <span className="font-bold">{c.courseB.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({c.sectionB.sectionName})
                      </span>
                      <span className="text-xs font-mono font-bold bg-white dark:bg-black/40 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-[#e31e24] dark:text-red-400">
                        {DAY_NAMES[c.day]} {c.overlapStart} - {c.overlapEnd}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button: Auto-solve with 0 conflicts */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                id="solve-conflicts-btn"
                onClick={onOpenAutoGenerator}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#e31e24] hover:bg-red-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Resolver combinaciones</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inter-Campus Commute Conflicts */}
      {interCampusConflicts.length > 0 && (
        <div
          id="inter-campus-alert-banner"
          className={`w-full rounded-2xl border shadow-xs p-3.5 transition-all ${
            darkMode ? 'bg-amber-950/40 border-amber-800/80 text-amber-200' : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-slate-950 shrink-0 shadow-xs">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm tracking-tight text-amber-700 dark:text-amber-300">
                    ⚠️ Alerta de Traslado entre Sedes ({interCampusConflicts.length})
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-200">
                    Tiempo de viaje insuficiente
                  </span>
                </div>

                <div className="mt-1.5 space-y-1 text-xs">
                  {interCampusConflicts.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 flex-wrap text-slate-800 dark:text-slate-200">
                      <span className="font-bold">{item.courseA}</span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold text-[10px]">
                        Campus {item.campusA} (hasta {item.endTimeA})
                      </span>
                      <span className="text-amber-600 font-bold">➔</span>
                      <span className="font-bold">{item.courseB}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-[10px]">
                        Campus {item.campusB} (inicia {item.startTimeB})
                      </span>
                      <span className="text-xs font-mono font-bold bg-white dark:bg-black/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                        Tienes {item.gapMinutes} min vs {item.requiredMinutes} min requeridos de traslado
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={onOpenAutoGenerator}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Optimizar por Sede</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
