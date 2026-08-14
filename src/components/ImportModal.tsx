import React, { useState } from 'react';
import { Course } from '../types/schedule';
import { parseSmartSchedule } from '../utils/parser';
import { UPC_SAMPLE_COURSES } from '../data/upcSampleData';
import { evaluateCommute, LimaDistrict } from '../utils/distance';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  BookOpen,
  ArrowRight,
  MapPin,
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCourses: (importedCourses: Course[], replaceExisting: boolean) => void;
  darkMode: boolean;
  userDistrict?: LimaDistrict;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportCourses,
  darkMode,
  userDistrict = 'Santiago de Surco',
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file' | 'manual' | 'presets'>('paste');
  const [promptMode, setPromptMode] = useState<'withCampus' | 'classic'>('withCampus');
  const [pastedText, setPastedText] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Manual Form State
  const [manualCourseName, setManualCourseName] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [manualCredits, setManualCredits] = useState(4);
  const [manualCycle, setManualCycle] = useState(5);
  const [manualSectionName, setManualSectionName] = useState('1');
  const [manualTeacher, setManualTeacher] = useState('');
  const [manualDay, setManualDay] = useState<'LU' | 'MA' | 'MI' | 'JU' | 'VI' | 'SA'>('LU');
  const [manualStart, setManualStart] = useState('08:00');
  const [manualEnd, setManualEnd] = useState('11:00');
  const [manualType, setManualType] = useState<'Teoría' | 'Laboratorio' | 'Práctica'>('Teoría');
  const [manualModality, setManualModality] = useState<'Presencial' | 'Semipresencial' | 'A distancia'>('Presencial');
  const [manualCampus, setManualCampus] = useState('San Isidro');

  if (!isOpen) return null;

  // Real-time preview of parsed text
  const previewParsed = parseSmartSchedule(pastedText);

  const promptWithCampus = `Actúa como un formateador de horarios universitarios para la UPC.
A partir de la información de cursos, horarios o captura de pantalla que te adjunte, responde ÚNICAMENTE con los datos en formato CSV (texto plano sin bloques de código ni títulos ni cabecera), utilizando exactamente las siguientes columnas separadas por espacios o tabulaciones:

CICLO CRÉDITOS CURSO TIPO HRS GR DOCENTE SEDE DIA1 INICIO1 FINAL1 DIA2 INICIO2 FINAL2

Reglas:
1. Asigna 0 en la columna HRS.
2. En TIPO usa únicamente 'TEORIA' o 'LABORATORIO'.
3. En SEDE usa: MONTERRICO, SAN_ISIDRO, SAN_MIGUEL, VILLA, o ONLINE.
4. Si el curso tiene un solo día de clase, deja DIA2, INICIO2, FINAL2 vacíos o repite el formato.
5. Formato de horas en 24h (ejemplo: 07:00, 10:00, 18:00).
6. En DIA usa: LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO.

Ejemplo de salida que debes generar:
V 5 PROGRAMACIÓN ORIENTADA A OBJETOS TEORIA 0 15969 TOLEDO ALLER LOURDES SAN_ISIDRO LUNES 07:00 10:00 MIERCOLES 07:00 10:00
V 4 DISEÑO Y ARQUITECTURA DE BD TEORIA 0 16012 CANAVAL SANCHEZ VICTOR MONTERRICO MARTES 09:00 12:00 JUEVES 09:00 11:00
VIII 3 REDES DE BANDA ANCHA TEORIA 0 14820 RAMIREZ DIAZ CARLOS ONLINE LUNES 18:00 21:00 MIERCOLES 18:00 20:00`;

  const promptClassic = `Actúa como un formateador de horarios universitarios para la UPC.
A partir de la información de cursos, horarios o captura de pantalla que te adjunte, responde ÚNICAMENTE con los datos en formato CSV (texto plano sin bloques de código ni títulos ni cabecera), utilizando exactamente las siguientes columnas separadas por espacios o tabulaciones:

CICLO CRÉDITOS CURSO TIPO HRS GR DOCENTE DIA1 INICIO1 FINAL1 DIA2 INICIO2 FINAL2

Reglas:
1. Asigna 0 en la columna HRS.
2. En TIPO usa únicamente 'TEORIA' o 'LABORATORIO'.
3. Si el curso tiene un solo día de clase, deja DIA2, INICIO2, FINAL2 vacíos o repite el formato.
4. Formato de horas en 24h (ejemplo: 07:00, 10:00, 18:00).
5. En DIA usa: LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO.

Ejemplo de salida que debes generar:
V 5 PROGRAMACIÓN ORIENTADA A OBJETOS TEORIA 0 15969 TOLEDO ALLER LOURDES LUNES 07:00 10:00 MIERCOLES 07:00 10:00
V 4 DISEÑO Y ARQUITECTURA DE BD TEORIA 0 16012 CANAVAL SANCHEZ VICTOR MARTES 09:00 12:00 JUEVES 09:00 11:00
VIII 3 REDES DE BANDA ANCHA TEORIA 0 14820 RAMIREZ DIAZ CARLOS LUNES 18:00 21:00 MIERCOLES 18:00 20:00`;

  const activePrompt = promptMode === 'withCampus' ? promptWithCampus : promptClassic;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(activePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseSmartSchedule(content);
        if (parsed.length > 0) {
          onImportCourses(parsed, replaceExisting);
          onClose();
        } else {
          alert('No se pudieron reconocer cursos en el archivo subido.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmPaste = () => {
    if (previewParsed.length === 0) {
      alert('Por favor pega texto válido de tu horario o banner UPC.');
      return;
    }
    onImportCourses(previewParsed, replaceExisting);
    onClose();
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCourseName.trim()) return;

    const newCourse: Course = {
      id: `manual-course-${Date.now()}`,
      code: manualCode.trim() || `UPC-${Math.floor(Math.random() * 900 + 100)}`,
      name: manualCourseName.trim(),
      credits: manualCredits,
      cycle: manualCycle,
      color: '#0d9488',
      sections: [
        {
          id: `sec-${Date.now()}`,
          sectionName: `Grupo ${manualSectionName || '1'}`,
          courseCode: manualCode.trim() || 'UPC-001',
          teachers: manualTeacher.trim() ? [manualTeacher.trim()] : ['Docente Asignado'],
          vacancies: '35 / 40',
          sessions: [
            {
              id: `sess-${Date.now()}`,
              day: manualDay,
              startTime: manualStart,
              endTime: manualEnd,
              type: manualType,
              modality: manualModality,
              campus: manualCampus,
              teacher: manualTeacher.trim() || 'Docente Asignado',
            },
          ],
        },
      ],
    };

    onImportCourses([newCourse], false);
    onClose();
  };

  return (
    <div
      id="import-schedule-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e31e24] flex items-center justify-center text-white font-extrabold shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg tracking-tight">
                Importar Horarios Universitarios
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Soporta formato UPC Banner, tabla copiada de ChatGPT / CSV, o creación manual.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button
            id="tab-paste-btn"
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'paste'
                ? 'border-[#e31e24] text-[#e31e24] dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>🤖 Pegar de ChatGPT / Banner UPC</span>
          </button>

          <button
            id="tab-file-btn"
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'file'
                ? 'border-[#e31e24] text-[#e31e24] dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📁 Subir Archivo CSV</span>
          </button>

          <button
            id="tab-manual-btn"
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'manual'
                ? 'border-[#e31e24] text-[#e31e24] dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>✏️ Crear Manualmente</span>
          </button>

          <button
            id="tab-presets-btn"
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'presets'
                ? 'border-[#e31e24] text-[#e31e24] dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>✨ Ejemplos UPC</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
          {/* TAB 1: PASTE TEXT / UPC BANNER */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              {/* ChatGPT Prompt Helper Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Paso 1: Selecciona el formato y copia el Prompt para ChatGPT</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center rounded-lg bg-slate-200 dark:bg-slate-700 p-0.5">
                      <button
                        onClick={() => setPromptMode('withCampus')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                          promptMode === 'withCampus'
                            ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        🏛️ Con Sedes UPC (Recomendado)
                      </button>
                      <button
                        onClick={() => setPromptMode('classic')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                          promptMode === 'classic'
                            ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        📄 Formato Estándar
                      </button>
                    </div>

                    <button
                      onClick={handleCopyPrompt}
                      className="px-3 py-1.5 rounded-lg bg-[#e31e24] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
                    >
                      {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPrompt ? '¡Copiado!' : 'Copiar Prompt'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 select-all overflow-x-auto max-h-32 custom-scrollbar whitespace-pre-wrap">
                  {activePrompt}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  👉 Pega este prompt en ChatGPT o Gemini junto a tu captura o texto de cursos de Banner UPC. Luego copia la respuesta generada y pégala en el recuadro de abajo.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Paso 2: Pega aquí la respuesta de ChatGPT o tu tabla de Banner UPC:
                </label>
                <textarea
                  rows={6}
                  placeholder={`Ejemplo de lo que debes pegar aquí:
V 5 PROGRAMACIÓN ORIENTADA A OBJETOS TEORIA 0 15969 TOLEDO ALLER LOURDES SAN_ISIDRO LUNES 07:00 10:00 MIERCOLES 07:00 10:00
V 4 DISEÑO Y ARQUITECTURA DE BD TEORIA 0 16012 CANAVAL SANCHEZ VICTOR MONTERRICO MARTES 09:00 12:00 JUEVES 09:00 11:00
VIII 3 REDES DE BANDA ANCHA TEORIA 0 14820 RAMIREZ DIAZ CARLOS ONLINE LUNES 18:00 21:00 MIERCOLES 18:00 20:00`}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#e31e24]"
                />
              </div>

              {/* Live Preview of recognized courses with campus & distance */}
              {previewParsed.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{previewParsed.length} Cursos detectados listos para importar</span>
                    </span>
                    <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400">
                      Distrito referencia: <strong>{userDistrict}</strong>
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar text-xs">
                    {previewParsed.map((c) => {
                      const detectedCampus = c.sections[0]?.sessions[0]?.campus || 'UPC';
                      const commute = evaluateCommute(userDistrict, detectedCampus);

                      return (
                        <div
                          key={c.name}
                          className="flex items-center justify-between py-1.5 px-2 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-100 dark:border-emerald-900/40 text-[11px]"
                        >
                          <div className="space-y-0.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {c.name} ({c.credits} cred)
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span>{c.sections.length} sección(es)</span>
                              <span>•</span>
                              <span>Docente: {c.sections[0]?.teachers[0] || 'Asignado'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-right">
                            {detectedCampus !== 'Online' && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                                  commute.level === 'close'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                    : commute.level === 'medium'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                    : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                                }`}
                              >
                                <span>{commute.badge}</span>
                                <span>{detectedCampus}</span>
                                <span>(~{commute.minutes}m)</span>
                              </span>
                            )}
                            {detectedCampus === 'Online' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                                💻 100% Online
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Options & Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Reemplazar cursos actuales (borrar anteriores)</span>
                </label>

                <button
                  id="confirm-import-paste-btn"
                  onClick={handleConfirmPaste}
                  disabled={previewParsed.length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Importar {previewParsed.length} Cursos</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: FILE UPLOAD */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center hover:border-emerald-500 dark:hover:border-emerald-500 transition group cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.txt,.json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-400 group-hover:text-emerald-500 transition" />
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  Haz clic o arrastra aquí tu archivo CSV / JSON
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Formatos soportados: .csv con comas o tabuladores, .txt, .json
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: MANUAL BUILDER */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualAdd} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Curso *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Inteligencia Artificial"
                    value={manualCourseName}
                    onChange={(e) => setManualCourseName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Código UPC
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 1ASI 0890"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Créditos
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={manualCredits}
                    onChange={(e) => setManualCredits(parseInt(e.target.value, 10) || 4)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ciclo
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={manualCycle}
                    onChange={(e) => setManualCycle(parseInt(e.target.value, 10) || 5)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Grupo / NRC
                  </label>
                  <input
                    type="text"
                    value={manualSectionName}
                    onChange={(e) => setManualSectionName(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo Sesión
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="Teoría">Teoría</option>
                    <option value="Laboratorio">Laboratorio</option>
                    <option value="Práctica">Práctica</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Día
                  </label>
                  <select
                    value={manualDay}
                    onChange={(e) => setManualDay(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="LU">Lunes</option>
                    <option value="MA">Martes</option>
                    <option value="MI">Miércoles</option>
                    <option value="JU">Jueves</option>
                    <option value="VI">Viernes</option>
                    <option value="SA">Sábado</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={manualStart}
                    onChange={(e) => setManualStart(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={manualEnd}
                    onChange={(e) => setManualEnd(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Docente
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del profesor"
                    value={manualTeacher}
                    onChange={(e) => setManualTeacher(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Modalidad
                  </label>
                  <select
                    value={manualModality}
                    onChange={(e) => setManualModality(e.target.value as any)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Semipresencial">Semipresencial</option>
                    <option value="A distancia">A distancia / Virtual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Campus / Sede
                  </label>
                  <select
                    value={manualCampus}
                    onChange={(e) => setManualCampus(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="San Isidro">San Isidro</option>
                    <option value="Monterrico">Monterrico</option>
                    <option value="Villa">Villa</option>
                    <option value="San Miguel">San Miguel</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Agregar Curso al Horario</span>
              </button>
            </form>
          )}

          {/* TAB 4: PRELOADED PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm">
                    Malla UPC Telecomunicaciones & Redes (Ciclo 8)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Incluye Radio Definido por Software, Redes de Banda Ancha, Controladores e Interfaces (como en la Imagen 1).
                  </p>
                </div>
                <button
                  onClick={() => {
                    onImportCourses(UPC_SAMPLE_COURSES.filter((c) => c.cycle === 8), replaceExisting);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs transition"
                >
                  Cargar Malla C8
                </button>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm">
                    Malla UPC Ingeniería de Sistemas (Ciclo 5)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Incluye Programación Orientada a Objetos, Base de Datos, Algoritmos con múltiples NRCs de Banner (como en la Imagen 3).
                  </p>
                </div>
                <button
                  onClick={() => {
                    onImportCourses(UPC_SAMPLE_COURSES.filter((c) => c.cycle === 5), replaceExisting);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 shadow-xs transition"
                >
                  Cargar Malla C5
                </button>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm">
                    Todos los Cursos de Ejemplo UPC (Completo)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Carga el catálogo total con todos los ciclos y secciones de prueba.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onImportCourses(UPC_SAMPLE_COURSES, true);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shrink-0 shadow-xs transition"
                >
                  Cargar Todo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
