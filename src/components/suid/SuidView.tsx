import React, { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
  onOpenNewEmployeeModal?: () => void;
  onOpenNewProjectModal?: () => void;
  onOpenNewDepartmentModal?: (orgId?: number) => void;
}

export const SuidView: React.FC<SuidViewProps> = ({
  tasks,
  onSaveTask,
  onDeleteTask,
  documentTypes,
  projects,
  departments,
  employees,
  onOpenNewEmployeeModal,
  onOpenNewProjectModal,
  onOpenNewDepartmentModal,
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

  // Экспорт данных в Excel (.xlsx)
  const handleExportExcel = async () => {
    try {
      const headers = [
        '№',
        'Дата поступления',
        'Срок план',
        'Срок факт',
        'Просрочка, дн.',
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
              .map((br) => `${br.departmentShortName}: ${br.isReceived ? 'Получен' : 'Отсутствует'}${br.documentDetails ? ` — ${br.documentDetails}` : ''}`)
              .join('; ');

        return [
          t.idx ?? t.id,
          t.receiptDate || '',
          t.plannedEndDate || '',
          t.actualEndDate || '',
          t.delayDays ?? 0,
          t.taskName || '',
          t.taskDescription || '',
          t.suidId || '',
          t.authorName || '',
          t.docTypeName || '',
          t.projectCode || '',
          t.projectName || '',
          depts,
          reports,
          t.curatorNames || '',
          t.notes || '',
        ];
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      ws['!cols'] = [
        { wch: 6 },  // №
        { wch: 15 }, // Дата поступления
        { wch: 15 }, // Срок план
        { wch: 15 }, // Срок факт
        { wch: 16 }, // Просрочка (дн.)
        { wch: 35 }, // Задача
        { wch: 30 }, // Описание задачи
        { wch: 14 }, // ID в СУИД
        { wch: 22 }, // Автор
        { wch: 18 }, // Тип документа
        { wch: 14 }, // Код проекта
        { wch: 25 }, // Название проекта
        { wch: 25 }, // СП
        { wch: 30 }, // Ежемесячный отчет
        { wch: 22 }, // Куратор
        { wch: 25 }, // Примечания
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Задачи СУИД');

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
      const defaultFileName = `${dateStr}_Задачи_СУИД.xlsx`;

      let targetFilePath: string | null = null;
      if (electronBridge.showSaveExcelDialog) {
        targetFilePath = await electronBridge.showSaveExcelDialog(defaultFileName);
      } else {
        targetFilePath = defaultFileName;
      }

      if (!targetFilePath) return;

      const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      if (electronBridge.saveFiles) {
        await electronBridge.saveFiles([
          {
            filePath: targetFilePath,
            base64Data,
          },
        ]);
      } else {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = targetFilePath.split(/[/\\]/).pop() || defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Ошибка экспорта в Excel:', err);
    }
  };

  // Печать перечня
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-4 w-full pb-8 animate-in fade-in duration-150">
      {/* Статистические карточки */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 rounded-2xl bg-white dark:bg-[#171A21] border border-slate-200 dark:border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-slate-500 dark:text-gray-400 font-medium">Всего в СУИД</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stats.total}</span>
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 opacity-80 dark:opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#171A21] border border-slate-200 dark:border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">В работе</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-amber-600 dark:text-amber-300 font-mono">{stats.inProgress}</span>
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400 opacity-80 dark:opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#171A21] border border-slate-200 dark:border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">С просрочкой</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-rose-600 dark:text-rose-300 font-mono">{stats.delayed}</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 opacity-80 dark:opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#171A21] border border-slate-200 dark:border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Завершенных</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-300 font-mono">{stats.completed}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 opacity-80 dark:opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#171A21] border border-slate-200 dark:border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">Сданных отчетов</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-teal-600 dark:text-teal-300 font-mono">{stats.reportsComplete}</span>
            <FileCheck2 className="w-4 h-4 text-teal-500 dark:text-teal-400 opacity-80 dark:opacity-60" />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-[#171A21] border border-slate-200 dark:border-[#2D3139] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] text-purple-700 dark:text-purple-400 font-medium">Требуют отчетов</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-purple-600 dark:text-purple-300 font-mono">{stats.reportsNeeded}</span>
            <TrendingUp className="w-4 h-4 text-purple-500 dark:text-purple-400 opacity-80 dark:opacity-60" />
          </div>
        </div>
      </div>

      {/* Панель действий: Добавить запись, Экспорт, Печать */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#171A21] border border-slate-200 dark:border-[#2D3139] p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить запись</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0F1115] dark:hover:bg-[#1F222B] border border-slate-200 dark:border-[#2D3139] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Экспорт в Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0F1115] dark:hover:bg-[#1F222B] border border-slate-200 dark:border-[#2D3139] text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500 dark:text-gray-400" />
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
        onOpenNewEmployeeModal={onOpenNewEmployeeModal}
        onOpenNewProjectModal={onOpenNewProjectModal}
        onOpenNewDepartmentModal={onOpenNewDepartmentModal}
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
