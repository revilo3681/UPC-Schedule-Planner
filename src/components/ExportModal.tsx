import React, { useState } from 'react';
import { Course, SelectedCourseMap } from '../types/schedule';
import { exportScheduleAsICS, exportScheduleAsJSON } from '../utils/export';
import {
  Download,
  Calendar,
  FileSpreadsheet,
  Printer,
  Share2,
  Check,
  X,
  Sparkles,
  Smartphone,
  Laptop,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  selectedSections: SelectedCourseMap;
  darkMode: boolean;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  courses,
  selectedSections,
  darkMode,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareLink = () => {
    // Generate base64 state parameter for url
    try {
      const stateObj = {
        s: selectedSections,
      };
      const hash = btoa(JSON.stringify(stateObj));
      const url = `${window.location.origin}${window.location.pathname}#plan=${hash}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div
      id="export-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 sm:p-6 ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e31e24] text-white flex items-center justify-center font-bold shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                Exportar y Compartir tu Horario
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lleva tu horario a tu celular, Google Calendar o imprímelo en PDF.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-2.5">
          {/* Option 1: Google Calendar (.ICS) */}
          <button
            onClick={() => {
              exportScheduleAsICS(courses, selectedSections);
              onClose();
            }}
            className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-left transition flex items-center gap-3.5 group shadow-xs"
          >
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-xs block text-slate-900 dark:text-white">
                Sincronizar con Google Calendar / Apple Calendar (.ICS)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Descarga un archivo .ics con todas las semanas y alarmas ya configuradas.
              </span>
            </div>
          </button>

          {/* Option 2: Print / PDF */}
          <button
            onClick={() => {
              onClose();
              setTimeout(handlePrint, 300);
            }}
            className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-left transition flex items-center gap-3.5 group shadow-xs"
          >
            <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-950/60 text-[#e31e24] dark:text-red-400 group-hover:scale-105 transition shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-xs block text-slate-900 dark:text-white">
                Imprimir o Guardar como PDF
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Formato limpio sin menús ni botones, listo para tu matrícula.
              </span>
            </div>
          </button>

          {/* Option 3: Share Link */}
          <button
            onClick={handleShareLink}
            className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-left transition flex items-center gap-3.5 group shadow-xs"
          >
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition shrink-0">
              {copiedLink ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <span className="font-bold text-xs block text-slate-900 dark:text-white">
                {copiedLink ? '¡Enlace copiado al portapapeles!' : 'Copiar enlace compartible'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Pásale tu horario a tus compañeros de carrera para comparar secciones.
              </span>
            </div>
          </button>

          {/* Option 4: Backup JSON */}
          <button
            onClick={() => {
              exportScheduleAsJSON(courses, selectedSections);
              onClose();
            }}
            className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-left transition flex items-center gap-3.5 group shadow-xs"
          >
            <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-xs block text-slate-900 dark:text-white">
                Descargar Respaldo JSON
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Guarda tus cursos y vuelve a cargarlos cuando quieras.
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
