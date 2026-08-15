import React, { useState } from 'react';
import { StudentProfile } from '../types/schedule';
import { LIMA_DISTRICTS, LimaDistrict, UPC_CAMPUSES, UPCCampus } from '../utils/distance';
import { User, Mail, GraduationCap, Building2, MapPin, X, Check, BookOpen } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onSaveProfile: (profile: StudentProfile) => void;
  darkMode: boolean;
}

const COMMON_CAREERS = [
  'Ingeniería de Software',
  'Ingeniería de Sistemas de Información',
  'Ingeniería de Telecomunicaciones y Redes',
  'Ingeniería Industrial',
  'Ingeniería Civil',
  'Ingeniería Mecatrónica',
  'Ingeniería Electrónica',
  'Administración y Negocios Internacionales',
  'Economía y Finanzas',
  'Marketing',
  'Arquitectura',
  'Diseño Profesional Gráfico',
  'Medicina',
  'Odontología',
  'Psicología',
  'Derecho',
  'Comunicación y Periodismo',
  'Otra Carrera',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  darkMode,
}) => {
  const [formData, setFormData] = useState<StudentProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);

  // Sync state if modal opens with different profile
  React.useEffect(() => {
    if (isOpen) {
      setFormData(profile);
      setIsSaved(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  // Helper to extract initials
  const initials = formData.fullName
    ? formData.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'UP';

  return (
    <div
      id="profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="profile-modal-content"
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all transform scale-100 ${
          darkMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Red Accent */}
        <div className="bg-gradient-to-r from-[#e31e24] to-red-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-lg border border-white/30 shadow-inner">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Perfil del Estudiante UPC</h2>
              <p className="text-xs text-red-100">Personaliza tus datos, carrera y distrito</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <User className="w-3.5 h-3.5 text-[#e31e24]" />
              <span>Nombres y Apellidos</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Ej: Alex Rivera Campos"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#e31e24] focus:outline-none transition"
            />
          </div>

          {/* Email & Student Code (Grid 2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Mail className="w-3.5 h-3.5 text-[#e31e24]" />
                <span>Correo Institucional / Personal</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="u202000001@upc.edu.pe"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#e31e24] focus:outline-none transition font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <BookOpen className="w-3.5 h-3.5 text-[#e31e24]" />
                <span>Código de Alumno</span>
              </label>
              <input
                type="text"
                value={formData.studentCode}
                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                placeholder="Ej: u202000001"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#e31e24] focus:outline-none transition font-mono uppercase"
              />
            </div>
          </div>

          {/* Career & Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <GraduationCap className="w-3.5 h-3.5 text-[#e31e24]" />
                <span>Carrera Universitaria</span>
              </label>
              <select
                value={formData.career}
                onChange={(e) => setFormData({ ...formData, career: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#e31e24] focus:outline-none transition"
              >
                {COMMON_CAREERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <span>Ciclo Actual</span>
              </label>
              <select
                value={formData.currentCycle}
                onChange={(e) =>
                  setFormData({ ...formData, currentCycle: parseInt(e.target.value, 10) })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#e31e24] focus:outline-none transition font-bold text-[#e31e24] dark:text-red-400"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((cyc) => (
                  <option key={cyc} value={cyc}>
                    {cyc}° Ciclo
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Base Campus & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Building2 className="w-3.5 h-3.5 text-[#e31e24]" />
                <span>Sede UPC Principal</span>
              </label>
              <select
                value={formData.campus}
                onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#e31e24] focus:outline-none transition"
              >
                {(Object.keys(UPC_CAMPUSES) as UPCCampus[])
                  .filter((camp) => camp !== 'Online')
                  .map((camp) => (
                  <option key={camp} value={camp}>
                    Campus {camp}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-[#e31e24]" />
                <span>Distrito de Residencia</span>
              </label>
              <select
                value={formData.userDistrict}
                onChange={(e) => setFormData({ ...formData, userDistrict: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#e31e24] focus:outline-none transition"
              >
                {LIMA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-[#e31e24] hover:bg-red-700 text-white font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95"
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Guardado!</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
