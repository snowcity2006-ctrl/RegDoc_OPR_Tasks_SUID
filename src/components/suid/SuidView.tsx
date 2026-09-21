import React, { useState, useMemo, useCallback } from 'react';
import {
  Layers,
  Plus,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck2,
  TrendingUp,
} from 'lucide-react';
import {
  SuidTaskRecord,
  DocumentType,
  Project,
  Department,
  Employee,
} from '../../types';
import { SuidTable } from './SuidTable';
import { SuidFilters, SuidFilterState } from './SuidFilters';
import { SuidModal } from './SuidModal';
import { SuidDetailModal } from './SuidDetailModal';
import { electronBridge } from '../../services/electronBridge';
import { formatDateRussian } from '../../utils/date';

interface SuidViewProps {
  tasks: SuidTaskRecord[];
  onSaveTask: (task: Omit<SuidTaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  documentTypes: DocumentType[];
  projects: Project[];
  departments: Department[];
  employees: Employee[];
}

export const SuidView: React.FC<SuidViewProps> = ({
  tasks,
  onSaveTask,
  onDeleteTask,
  documentTypes,
  projects,
  departments,
  employees,
}) => {
  // Состояние фильтрации
  const [filters, setFilters] = useState<SuidFilterState>({
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

  // Модальные окна
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SuidTaskRecord | null>(null);
  const [detailTask, setDetailTask] = useState<SuidTaskRecord | null>(null);

  // Фильтрация задач
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Поисковый запрос
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const branchReportsText = (t.branchReports || [])
          .map((br) => `${br.departmentShortName} ${br.documentDetails}`)
          .join(' ')
          .toLowerCase();
        const partDeptsText = (t.participatingDepartments || [])
          .map((pd) => pd.departmentShortName)
          .join(' ')
          .toLowerCase();

        const match =
          t.taskName.toLowerCase().includes(query) ||
          t.taskDescription.toLowerCase().includes(query) ||
          t.suidId.toLowerCase().includes(query) ||
          t.authorName.toLowerCase().includes(query) ||
          t.projectName.toLowerCase().includes(query) ||
          t.projectCode.toLowerCase().includes(query) ||
          t.curatorNames.toLowerCase().includes(query) ||
          t.docTypeName.toLowerCase().includes(query) ||
          t.notes.toLowerCase().includes(query) ||
          branchReportsText.includes(query) ||
          partDeptsText.includes(query);

        if (!match) return false;
      }

      // Тип документа
      if (filters.docTypeId !== null && t.docTypeId !== filters.docTypeId) {
        return false;
      }

      // Проект
      if (filters.projectId !== null && t.projectId !== filters.projectId) {
        return false;
      }

      // Структурное подразделение
      if (filters.departmentShortName !== null) {
        const inDepts = (t.participatingDepartments || []).some(
          (d) => d.departmentShortName.toLowerCase() === filters.departmentShortName?.toLowerCase()
        );
        if (!inDepts) return false;
      }

      // Куратор от ОПР
      if (filters.curatorId !== null) {
        const inCurators = (t.curatorEmployeeIds || []).includes(filters.curatorId);
        if (!inCurators) return false;
      }

      // Статусы
      if (filters.status === 'delayed') {
        if (t.delayDays <= 0) return false;
      } else if (filters.status === 'in_progress') {
        if (Boolean(t.actualEndDate)) return false;
      } else if (filters.status === 'completed') {
        if (!t.actualEndDate) return false;
      } else if (filters.status === 'report_received') {
        if (t.isReportNotRequired) return false;
        if (!t.branchReports || t.branchReports.length === 0) return false;
        const allReceived = t.branchReports.every((br) => br.isReceived);
        if (!allReceived) return false;
      } else if (filters.status === 'report_waiting') {
        if (t.isReportNotRequired) return false;
        const allReceived = t.branchReports && t.branchReports.length > 0 && t.branchReports.every((br) => br.isReceived);
        if (allReceived) return false;
      } else if (filters.status === 'report_not_required') {
        if (!t.isReportNotRequired) return false;
      }

      // Фильтр по дате
      const targetDate = t[filters.dateField];
      if (filters.dateFrom && (!targetDate || targetDate < filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && (!targetDate || targetDate > filters.dateTo)) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Статистика
  const stats = useMemo(() => {
    const total = tasks.length;
    const delayed = tasks.filter((t) => t.delayDays > 0).length;
    const inProgress = tasks.filter((t) => !t.actualEndDate).length;
    const completed = tasks.filter((t) => Boolean(t.actualEndDate)).length;
    const reportsNeeded = tasks.filter((t) => !t.isReportNotRequired).length;
    const reportsComplete = tasks.filter(
      (t) => !t.isReportNotRequired && t.branchReports && t.branchReports.length > 0 && t.branchReports.every((br) => br.isReceived)
    ).length;

    return { total, delayed, inProgress, completed, reportsNeeded, reportsComplete };
  }, [tasks]);

  const handleOpenNew = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const handleEdit = (task: SuidTaskRecord) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleView = (task: SuidTaskRecord) => {
    setDetailTask(task);
  };

  // Экспорт данных в CSV с поддержкой русской кодировки (BOM UTF-8)
  const handleExportCsv = async () => {
    const headers = [
      '№',
      'Дата поступления',
      'Срок план',
      'Срок факт',
      'Просрочка (дн.)',
      'Задача',
      'Описание задачи',
      'ID в СУИД',
      'Автор',
      'Тип документа',
      'Код проекта',
      'Название проекта',
      'Структурные подразделения',
      'Ежемесячный отчет',
      'Куратор от ОПР',
      'Примечания',
    ];

    const rows = filteredTasks.map((t) => {
      const depts = (t.participatingDepartments || []).map((d) => d.departmentShortName).join('; ');
      const reports = t.isReportNotRequired
        ? 'Отчет не требуется'
        : (t.branchReports || [])
            .map((br) => `${br.departmentShortName}: ${br.isReceived ? 'Получен' : 'Отсутствует'}${br.documentDetails ? ` (${br.documentDetails})` : ''}`)
            .join('; ');

      return [
        t.idx ?? t.id,
        t.receiptDate || '',
        t.plannedEndDate || '',
        t.actualEndDate || '',
        t.delayDays ?? 0,
        `"${(t.taskName || '').replace(/"/g, '""')}"`,
        `"${(t.taskDescription || '').replace(/"/g, '""')}"`,
        t.suidId || '',
        `"${(t.authorName || '').replace(/"/g, '""')}"`,
        t.docTypeName || '',
        t.projectCode || '',
        `"${(t.projectName || '').replace(/"/g, '""')}"`,
        `"${depts.replace(/"/g, '""')}"`,
        `"${reports.replace(/"/g, '""')}"`,
        `"${(t.curatorNames || '').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SUID_Tasks_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Печать перечня
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full px-2 sm:px-4 pb-8 animate-in fade-in duration-150">
      {/* Статистические карточки */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-2xl bg-[#171A21] border border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-gray-400 font-medium">Всего в СУИД</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-white font-mono">{stats.total}</span>
            <Layers className="w-4 h-4 text-blue-400 opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#171A21] border border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-amber-400 font-medium">В работе</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-300 font-mono">{stats.inProgress}</span>
            <Clock className="w-4 h-4 text-amber-400 opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#171A21] border border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-rose-400 font-medium">С просрочкой</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-300 font-mono">{stats.delayed}</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#171A21] border border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-emerald-400 font-medium">Завершенных</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-300 font-mono">{stats.completed}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#171A21] border border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-teal-400 font-medium">Сданных отчетов</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-teal-300 font-mono">{stats.reportsComplete}</span>
            <FileCheck2 className="w-4 h-4 text-teal-400 opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#171A21] border border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-purple-400 font-medium">Требуют отчетов</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-purple-300 font-mono">{stats.reportsNeeded}</span>
            <TrendingUp className="w-4 h-4 text-purple-400 opacity-60" />
          </div>
        </div>
      </div>

      {/* Панель действий: Добавить запись, Экспорт, Печать */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#171A21] border border-[#2D3139] p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить запись в СУИД</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-[#0F1115] border border-[#2D3139] hover:bg-[#1F222B] text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Экспорт в CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-[#0F1115] border border-[#2D3139] hover:bg-[#1F222B] text-gray-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-gray-400" />
            <span>Печать</span>
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <SuidFilters
        filters={filters}
        onChange={setFilters}
        documentTypes={documentTypes}
        projects={projects}
        departments={departments}
        employees={employees}
        totalCount={tasks.length}
        filteredCount={filteredTasks.length}
      />

      {/* Табличная часть */}
      <SuidTable
        tasks={filteredTasks}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={onDeleteTask}
      />

      {/* Модальное окно создания / редактирования */}
      <SuidModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={onSaveTask}
        task={editingTask}
        documentTypes={documentTypes}
        projects={projects}
        departments={departments}
        employees={employees}
      />

      {/* Модальное окно детального просмотра */}
      <SuidDetailModal
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={(t) => {
          setDetailTask(null);
          handleEdit(t);
        }}
      />
    </div>
  );
};
