import React, { useState } from 'react';
import {
  Search,
  Filter,
  X,
  Calendar,
  RotateCcw,
  Tag,
  Building2,
  Users,
  AlertTriangle,
  FileCheck2,
  Layers,
  Clock,
  Ban,
} from 'lucide-react';
import { DocumentType, Project, Department, Employee } from '../../types';

export interface SuidFilterState {
  searchQuery: string;
  docTypeId: number | null;
  projectId: number | null;
  departmentShortName: string | null;
  curatorId: number | null;
  status: 'all' | 'delayed' | 'in_progress' | 'completed' | 'report_received' | 'report_waiting' | 'report_not_required';
  dateField: 'receiptDate' | 'plannedEndDate' | 'actualEndDate';
  dateFrom: string;
  dateTo: string;
}

interface SuidFiltersProps {
  filters: SuidFilterState;
  onChange: (filters: SuidFilterState) => void;
  documentTypes: DocumentType[];
  projects: Project[];
  departments: Department[];
  employees: Employee[];
  totalCount: number;
  filteredCount: number;
}

export const SuidFilters: React.FC<SuidFiltersProps> = React.memo(({
  filters,
  onChange,
  documentTypes,
  projects,
  departments,
  employees,
  totalCount,
  filteredCount,
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleReset = () => {
    onChange({
      searchQuery: '',
      docTypeId: null,
      projectId: null,
      departmentShortName: null,
      curatorId: null,
      status: 'all',
      dateField: 'plannedEndDate',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    filters.docTypeId !== null ||
    filters.projectId !== null ||
    filters.departmentShortName !== null ||
    filters.curatorId !== null ||
    filters.status !== 'all' ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  return (
    <div className="bg-[#171A21] border border-[#2D3139] rounded-2xl p-3.5 shadow-md flex flex-col gap-3">
      {/* Верхняя строка: быстрый текстовый поиск + переключатели */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Поиск по задаче, описанию, ID СУИД, автору, проекту, куратору..."
            className="w-full pl-9 pr-8 py-2 bg-[#0F1115] border border-[#2D3139] focus:border-blue-500 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-hidden transition-colors"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Быстрый фильтр по статусу */}
        <div className="flex items-center gap-1 bg-[#0F1115] p-1 rounded-xl border border-[#2D3139] text-xs">
          <button
            type="button"
            onClick={() => onChange({ ...filters, status: 'all' })}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              filters.status === 'all'
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Все
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, status: 'delayed' })}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              filters.status === 'delayed'
                ? 'bg-rose-600 text-white font-medium'
                : 'text-gray-400 hover:text-rose-300'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Просрочено
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, status: 'in_progress' })}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              filters.status === 'in_progress'
                ? 'bg-amber-600 text-white font-medium'
                : 'text-gray-400 hover:text-amber-300'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            В работе
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, status: 'completed' })}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              filters.status === 'completed'
                ? 'bg-emerald-600 text-white font-medium'
                : 'text-gray-400 hover:text-emerald-300'
            }`}
          >
            <FileCheck2 className="w-3 h-3 text-emerald-400" />
            Завершенные
          </button>
        </div>

        {/* Кнопка подробных фильтров */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            expanded || hasActiveFilters
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
              : 'bg-[#0F1115] border-[#2D3139] text-gray-300 hover:bg-[#1C1F28]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Фильтры</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          )}
        </button>

        {/* Сброс фильтров */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            title="Сбросить все примененные фильтры"
            className="p-2 rounded-xl border border-[#2D3139] bg-[#0F1115] text-gray-400 hover:text-white hover:bg-[#1C1F28] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Счетчик */}
        <div className="text-xs text-gray-400 ml-auto whitespace-nowrap">
          Найдено: <span className="font-semibold text-white">{filteredCount}</span> из {totalCount}
        </div>
      </div>

      {/* Развернутая панель фильтров */}
      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#2D3139] text-xs">
          {/* Тип документа */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-gray-400 flex items-center gap-1">
              <Tag className="w-3 h-3 text-blue-400" />
              Тип документа (из справочника)
            </label>
            <select
              value={filters.docTypeId ?? ''}
              onChange={(e) =>
                onChange({ ...filters, docTypeId: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="">Все типы документов</option>
              {documentTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>
                  {dt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Проект */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-gray-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              Проект (код / название)
            </label>
            <select
              value={filters.projectId ?? ''}
              onChange={(e) =>
                onChange({ ...filters, projectId: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500 truncate"
            >
              <option value="">Все проекты</option>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.code ? `[${pr.code}] ` : ''}{pr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Подразделение */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-gray-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-400" />
              Структурное подразделение
            </label>
            <select
              value={filters.departmentShortName ?? ''}
              onChange={(e) =>
                onChange({ ...filters, departmentShortName: e.target.value || null })
              }
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="">Все подразделения</option>
              {departments.map((d) => (
                <option key={d.id} value={d.shortName}>
                  {d.shortName} - {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Куратор от ОПР */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-gray-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-400" />
              Куратор от ОПР
            </label>
            <select
              value={filters.curatorId ?? ''}
              onChange={(e) =>
                onChange({ ...filters, curatorId: e.target.value ? Number(e.target.value) : null })
              }
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="">Все сотрудники/кураторы</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.departmentShortName || 'ОПР'})
                </option>
              ))}
            </select>
          </div>

          {/* Фильтр по ежемесячному отчету */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-gray-400 flex items-center gap-1">
              <FileCheck2 className="w-3 h-3 text-teal-400" />
              Статус ежемесячного отчета
            </label>
            <select
              value={
                ['report_received', 'report_waiting', 'report_not_required'].includes(filters.status)
                  ? filters.status
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value as any;
                onChange({ ...filters, status: val || 'all' });
              }}
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="">Не фильтровать по отчету</option>
              <option value="report_received">Отчет получен (все подразделения)</option>
              <option value="report_waiting">Ожидается отчет (не все получены)</option>
              <option value="report_not_required">Отчет не требуется</option>
            </select>
          </div>

          {/* Диапазон дат: выбор типа даты */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              Поле даты для диапазона
            </label>
            <select
              value={filters.dateField}
              onChange={(e) => onChange({ ...filters, dateField: e.target.value as any })}
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="plannedEndDate">Срок план</option>
              <option value="receiptDate">Дата поступления</option>
              <option value="actualEndDate">Срок факт</option>
            </select>
          </div>

          {/* Дата с */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-gray-400">Дата с</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Дата по */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-gray-400">Дата по</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
});
