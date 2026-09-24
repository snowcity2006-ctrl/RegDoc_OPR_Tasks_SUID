import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Briefcase, X, Check, AlertCircle, Building2, User, Maximize2, Minimize2 } from 'lucide-react';
import { Project, Organization, Employee, Department } from '../../types';
import { SearchableMultiSelect, MultiSelectOption } from '../documents/SearchableMultiSelect';
import { OrganizationModal } from './OrganizationModal';
import { EmployeeModal } from './EmployeeModal';
import { DepartmentModal } from './DepartmentModal';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>;
  organizations: Organization[];
  employees: Employee[];
  departments: Department[];
  onSaveOrg: (org: Omit<Organization, 'id'> & { id?: number }) => Promise<void>;
  onSaveEmp: (emp: Omit<Employee, 'id'> & { id?: number }) => Promise<void>;
  onSaveDept: (dept: Omit<Department, 'id'> & { id?: number }) => Promise<void>;
  initialData?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  organizations,
  employees,
  departments,
  onSaveOrg,
  onSaveEmp,
  onSaveDept,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [organizationIds, setOrganizationIds] = useState<number[]>([]);
  const [gipEmployeeIds, setGipEmployeeIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Состояния для быстрых вложенных модальных окон добавления организаций и сотрудников
  const [isNewOrgModalOpen, setIsNewOrgModalOpen] = useState(false);
  const [isNewEmpModalOpen, setIsNewEmpModalOpen] = useState(false);
  const [isNewDeptModalOpen, setIsNewDeptModalOpen] = useState(false);
  const [deptInitialOrgId, setDeptInitialOrgId] = useState<number | undefined>(undefined);

  // Ссылки для отслеживания добавления новых организаций и сотрудников
  const prevOrgsLengthRef = useRef(organizations.length);
  const prevEmpsLengthRef = useRef(employees.length);

  // Сброс и инициализация полей формы при открытии
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setName(initialData.name || '');
      setCode(initialData.code || '');
      setOrganizationIds(initialData.organizationIds || []);
      setGipEmployeeIds(initialData.gipEmployeeIds || []);
    } else {
      setName('');
      setCode('');
      setOrganizationIds([]);
      setGipEmployeeIds([]);
    }
    setError(null);
    prevOrgsLengthRef.current = organizations.length;
    prevEmpsLengthRef.current = employees.length;
  }, [initialData, isOpen]);

  // Автоматическое добавление новой организации в выбранные без потери других введенных данных
  useEffect(() => {
    if (isOpen && organizations.length > prevOrgsLengthRef.current) {
      const latestOrg = organizations[organizations.length - 1];
      if (latestOrg && !organizationIds.includes(latestOrg.id)) {
        setOrganizationIds((prev) => [...prev, latestOrg.id]);
      }
    }
    prevOrgsLengthRef.current = organizations.length;
  }, [organizations, isOpen, organizationIds]);

  // Автоматическое добавление нового сотрудника (ГИПа) в выбранные без потери других введенных данных
  useEffect(() => {
    if (isOpen && employees.length > prevEmpsLengthRef.current) {
      const latestEmp = employees[employees.length - 1];
      if (latestEmp && !gipEmployeeIds.includes(latestEmp.id)) {
        setGipEmployeeIds((prev) => [...prev, latestEmp.id]);
      }
    }
    prevEmpsLengthRef.current = employees.length;
  }, [employees, isOpen, gipEmployeeIds]);

  // Подготовка списка опций для выбора организаций
  const organizationOptions: MultiSelectOption[] = useMemo(() => {
    return organizations.map((org) => ({
      id: org.id,
      label: org.name,
      subLabel: org.director ? `Руководитель: ${org.director}` : undefined,
      badge: org.email || undefined,
      searchStr: `${org.name} ${org.director || ''} ${org.email || ''}`,
    }));
  }, [organizations]);

  // Подготовка списка опций для выбора сотрудников (ГИП)
  const employeeOptions: MultiSelectOption[] = useMemo(() => {
    return employees.map((emp) => ({
      id: emp.id,
      label: emp.fullName,
      subLabel: emp.position ? `${emp.position} (${emp.departmentShortName})` : emp.departmentShortName,
      badge: emp.organizationName || undefined,
      searchStr: `${emp.fullName} ${emp.position || ''} ${emp.departmentShortName} ${emp.organizationName || ''}`,
    }));
  }, [employees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Поле «Название проекта» обязательно для заполнения');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initialData ? initialData.id : undefined,
        name: name.trim(),
        code: code.trim(),
        organizationIds,
        gipEmployeeIds,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения проекта');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        id="project-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      >
        <div
          id="project-modal-dialog"
          className={`bg-white dark:bg-[#171A21] border border-slate-200 dark:border-[#2D3139] rounded-2xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
            isMaximized
              ? 'w-full h-full max-w-none max-h-none rounded-none'
              : 'w-full max-w-2xl max-h-[90vh]'
          }`}
        >
          {/* Шапка модального окна */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2D3139] bg-slate-50 dark:bg-[#1F222B]/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {initialData ? 'Редактирование проекта' : 'Новый проект'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">Справочник проектов и объектов проектирования</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? 'Восстановить размер' : 'Развернуть на весь экран'}
                className="p-2 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Закрыть окно"
                className="p-2 text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Форма добавления / редактирования проекта */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-600 dark:text-rose-300 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500 dark:text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1.2. Название проекта (обязательное) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Название проекта <span className="text-rose-500 dark:text-rose-400">*</span>
                </label>
                <input
                  id="project-name-input"
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Обустройство Харасавэйского ГКМ"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D3139] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none transition-all"
                />
              </div>

              {/* 1.3. Код проекта */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Код проекта
                </label>
                <input
                  id="project-code-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Например: ХГКМ-0825 или 2026-ПД-01"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0F1115] border border-slate-200 dark:border-[#2D3139] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none transition-all font-mono"
                />
              </div>

              {/* 1.4. Проектная организация (множественный выбор + кнопка "+") */}
              <div>
                <SearchableMultiSelect
                  id="project-orgs-select"
                  label="Проектная организация"
                  icon={<Building2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />}
                  options={organizationOptions}
                  selectedIds={organizationIds}
                  onChange={setOrganizationIds}
                  placeholder="-- Выберите проектные организации --"
                  emptyMessage="Организации не найдены"
                  onAddNew={() => setIsNewOrgModalOpen(true)}
                  addNewTitle="Добавить новую организацию в справочник"
                  chipColor="blue"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-500">
                  Можно выбрать несколько организаций. Нажмите «+», чтобы быстро добавить новую организацию без потери введенных данных.
                </p>
              </div>

              {/* 1.5. ГИП (множественный выбор + кнопка "+") */}
              <div>
                <SearchableMultiSelect
                  id="project-gips-select"
                  label="ГИП (Главный инженер проекта)"
                  icon={<User className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
                  options={employeeOptions}
                  selectedIds={gipEmployeeIds}
                  onChange={setGipEmployeeIds}
                  placeholder="-- Выберите ответственных ГИП --"
                  emptyMessage="Сотрудники не найдены"
                  onAddNew={() => setIsNewEmpModalOpen(true)}
                  addNewTitle="Добавить нового сотрудника в справочник"
                  chipColor="indigo"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-gray-500">
                  Сотрудники, назначенные главными инженерами по проекту. Нажмите «+», чтобы добавить нового сотрудника без потери введенных данных.
                </p>
              </div>
            </div>

            {/* Подвал формы с кнопками */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-[#2D3139] bg-slate-50 dark:bg-[#1F222B]/40 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                id="project-submit-btn"
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Сохранить</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Вложенная модалка: Добавление новой организации по кнопке "+" */}
      {isNewOrgModalOpen && (
        <OrganizationModal
          isOpen={isNewOrgModalOpen}
          onClose={() => setIsNewOrgModalOpen(false)}
          onSave={async (org) => {
            await onSaveOrg(org);
            setIsNewOrgModalOpen(false);
          }}
          initialData={null}
        />
      )}

      {/* Вложенная модалка: Добавление нового сотрудника по кнопке "+" */}
      {isNewEmpModalOpen && (
        <EmployeeModal
          isOpen={isNewEmpModalOpen}
          onClose={() => setIsNewEmpModalOpen(false)}
          onSave={async (emp) => {
            await onSaveEmp(emp);
            setIsNewEmpModalOpen(false);
          }}
          departments={departments}
          organizations={organizations}
          onOpenNewOrgModal={() => setIsNewOrgModalOpen(true)}
          onOpenNewDepartmentModal={(orgId) => {
            setDeptInitialOrgId(orgId);
            setIsNewDeptModalOpen(true);
          }}
          initialData={null}
        />
      )}

      {/* Вложенная модалка: Добавление подразделения из модалки сотрудника */}
      {isNewDeptModalOpen && (
        <DepartmentModal
          isOpen={isNewDeptModalOpen}
          onClose={() => {
            setIsNewDeptModalOpen(false);
            setDeptInitialOrgId(undefined);
          }}
          onSave={async (dept) => {
            await onSaveDept(dept);
            setIsNewDeptModalOpen(false);
            setDeptInitialOrgId(undefined);
          }}
          organizations={organizations}
          onOpenNewOrgModal={() => setIsNewOrgModalOpen(true)}
          initialData={null}
          defaultOrganizationId={deptInitialOrgId}
        />
      )}
    </>
  );
};
