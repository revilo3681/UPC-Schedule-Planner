import React from 'react';
import {
  Calendar,
  Sparkles,
  Download,
  Plus,
  RotateCcw,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  MapPin,
  Edit3,
} from 'lucide-react';
import { ScheduleStats, StudentProfile } from '../types/schedule';
import { LimaDistrict, LIMA_DISTRICTS } from '../utils/distance';

interface HeaderNavbarProps {
  currentCycle: number;
  onCycleChange: (cycle: number) => void;
  activeView: 'grid' | 'list' | 'table' | 'auto';
  onViewChange: (view: 'grid' | 'list' | 'table' | 'auto') => void;
  stats: ScheduleStats;
  onOpenImport: () => void;
  onOpenAutoGenerator: () => void;
  onOpenExport: () => void;
  onReset: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  totalCoursesCount: number;
  selectedCoursesCount: number;
  userDistrict?: LimaDistrict;
  onDistrictChange?: (district: LimaDistrict) => void;
  profile: StudentProfile;
  onOpenProfile: () => void;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  currentCycle,
  onCycleChange,
  activeView,
  onViewChange,
  stats,
  onOpenImport,
  onOpenAutoGenerator,
  onOpenExport,
  onReset,
  darkMode,
  onToggleDarkMode,
  totalCoursesCount,
  selectedCoursesCount,
  userDistrict = 'Santiago de Surco',
  onDistrictChange,
  profile,
  onOpenProfile,
}) => {
  // Extract initials
  const initials = profile.fullName
    ? profile.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'UP';

  return (
    <header
      id="app-header"
      className={`no-print border-b transition-colors ${
        darkMode
          ? 'bg-slate-900/95 backdrop-blur-md border-slate-800 text-slate-100 shadow-md'
          : 'bg-white border-slate-200 text-slate-800 shadow-xs'
      } sticky top-0 z-30`}
    >
      {/* Top Banner / Brand & Navigation */}
      <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand logo with UPC red badge & University Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-[#e31e24] to-red-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs shrink-0 select-none ring-2 ring-red-500/20">
            U
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                UPC Schedule Planner
              </h1>
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-[#e31e24] dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-900">
                SumPlus
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px] sm:max-w-none">
              Ciclo 2026-02 • {profile.career || 'Facultad de Ingeniería'}
            </p>
          </div>
        </div>

        {/* Center: Cycle Selector & View Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Functional Cycle Switcher */}
          <div className="relative flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5 text-xs font-medium shadow-2xs">
            <button
              id="prev-cycle-btn"
              onClick={() => onCycleChange(Math.max(0, currentCycle - 1))}
              disabled={currentCycle <= 0}
              className="px-2 py-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 flex items-center transition text-slate-600 dark:text-slate-300"
              title="Ciclo anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Cycle Dropdown / direct selector */}
            <select
              id="cycle-select-dropdown"
              value={currentCycle}
              onChange={(e) => onCycleChange(parseInt(e.target.value, 10))}
              className="px-2 py-1 font-bold text-[#e31e24] dark:text-red-400 bg-transparent border-0 focus:ring-0 focus:outline-none cursor-pointer hover:underline text-xs"
              title="Seleccionar ciclo académico"
            >
              <option value={0} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold">
                Todos
              </option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cyc) => (
                <option key={cyc} value={cyc} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold">
                  {cyc}° Ciclo
                </option>
              ))}
            </select>

            <button
              id="next-cycle-btn"
              onClick={() => onCycleChange(Math.min(10, currentCycle + 1))}
              disabled={currentCycle >= 10}
              className="px-2 py-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 flex items-center transition text-slate-600 dark:text-slate-300"
              title="Ciclo siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Segmented View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-lg text-xs border border-slate-200/80 dark:border-slate-700/80">
            <button
              id="view-grid-btn"
              onClick={() => onViewChange('grid')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md transition-all text-xs font-semibold flex items-center gap-1.5 ${
                activeView === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-[#e31e24] dark:text-red-400" />
              <span>Semanal</span>
            </button>
            <button
              id="view-list-btn"
              onClick={() => onViewChange('list')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md transition-all text-xs font-semibold flex items-center gap-1.5 ${
                activeView === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5 text-blue-500" />
              <span>Lista ({selectedCoursesCount}/{totalCoursesCount})</span>
            </button>
            <button
              id="view-table-btn"
              onClick={() => onViewChange('table')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md transition-all text-xs font-semibold flex items-center gap-1.5 ${
                activeView === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Tabla UPC</span>
            </button>
          </div>
        </div>

        {/* Right: Key Actions + Student Profile Badge */}
        <div className="flex items-center gap-2.5">
          {/* Quick Action Tools */}
          <div className="flex items-center gap-1.5">
            {/* Auto Generator Button */}
            <button
              id="open-auto-generator-btn"
              onClick={onOpenAutoGenerator}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              title="Generador automático de combinaciones sin cruces"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current text-slate-950" />
              <span className="font-extrabold">Auto ⚡</span>
            </button>

            {/* Import Button */}
            <button
              id="open-import-btn"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e31e24] hover:bg-red-700 text-white font-bold text-xs shadow-xs active:scale-95 transition cursor-pointer"
              title="Importar horarios desde Banner UPC, CSV o Manual"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar</span>
            </button>

            {/* Export Button */}
            <button
              id="open-export-btn"
              onClick={onOpenExport}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Exportar calendario, PDF o compartir"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden md:inline">Exportar</span>
            </button>

            {/* Reset button */}
            <button
              id="reset-schedule-btn"
              onClick={onReset}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[#e31e24] hover:bg-red-50 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Reiniciar selección de cursos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Dark mode toggle */}
            <button
              id="toggle-dark-mode-btn"
              onClick={onToggleDarkMode}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
              title={darkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>

          {/* Student Profile User Banner & Editor trigger */}
          <button
            id="student-profile-trigger"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 border-l pl-3 border-slate-200 dark:border-slate-800 hover:opacity-80 transition group text-left cursor-pointer"
            title="Editar mi perfil, nombre y correo"
          >
            <div className="hidden lg:block text-right">
              <div className="flex items-center gap-1 justify-end">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-[#e31e24] transition">
                  {profile.fullName || 'Estudiante UPC'}
                </p>
                <Edit3 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                {profile.email || profile.studentCode || 'estudiante@upc.edu.pe'}
              </p>
            </div>
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-red-600 to-indigo-700 p-0.5 shadow-xs shrink-0 ring-2 ring-red-500/20">
              <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center text-white font-extrabold text-xs">
                {initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
            </div>
          </button>
        </div>
      </div>

      {/* Secondary Metrics Ribbon */}
      <div
        className={`px-4 sm:px-6 lg:px-8 py-2 border-t text-xs flex flex-wrap items-center justify-between gap-3 ${
          darkMode
            ? 'bg-slate-950/80 border-slate-800 text-slate-300'
            : 'bg-[#f8fafc] border-slate-200 text-slate-700'
        }`}
      >
        <div className="max-w-[1920px] mx-auto w-full flex flex-wrap items-center justify-between gap-y-2">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            {/* Total Credits */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">Créditos:</span>
              <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                {stats.totalCredits} cr
              </span>
            </div>

            {/* Total Active Hours */}
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-400">Horas Semanales:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {stats.activeHours} hrs
              </span>
            </div>

            {/* Days on campus / study */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-400">Días con Clases:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {stats.daysCount} días / sem
              </span>
            </div>

            {/* Free / Empty Hours */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-400">Huecos Libres:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                {stats.emptyHours} hrs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Conflicts Warning Pill */}
            {stats.conflictsCount > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950 text-[#e31e24] dark:text-red-300 border border-red-300 dark:border-red-800 font-bold text-xs animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{stats.conflictsCount} cruce(s) detectado(s)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-xs">
                <span>✓ Sin cruces de horario</span>
              </div>
            )}

            {/* District Travel Selector */}
            {onDistrictChange && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-[#e31e24]" />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Distrito:
                </span>
                <select
                  value={userDistrict}
                  onChange={(e) => onDistrictChange(e.target.value as LimaDistrict)}
                  className="bg-transparent border-0 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  {LIMA_DISTRICTS.map((d) => (
                    <option key={d} value={d} className="dark:bg-slate-900">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
