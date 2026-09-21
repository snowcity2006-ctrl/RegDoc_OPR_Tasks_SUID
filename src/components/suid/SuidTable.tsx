import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  Eye,
  Edit2,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  Maximize2,
  Minimize2,
  RotateCcw,
  CheckCircle2,
  Clock,
  FileCheck2,
  Ban,
  GripHorizontal,
  MoveDiagonal,
} from 'lucide-react';
import { SuidTaskRecord } from '../../types';
import { formatDateRussian } from '../../utils/date';

interface SuidTableProps {
  tasks: SuidTaskRecord[];
  onView?: (task: SuidTaskRecord) => void;
  onEdit?: (task: SuidTaskRecord) => void;
  onDelete?: (id: number) => Promise<void>;
}

type SortField =
  | 'idx'
  | 'receiptDate'
  | 'plannedEndDate'
  | 'actualEndDate'
  | 'delayDays'
  | 'taskName'
  | 'taskDescription'
  | 'suidId'
  | 'authorName'
  | 'docTypeName'
  | 'projectCode'
  | 'projectName'
  | 'curatorNames';

export const SuidTable: React.FC<SuidTableProps> = ({
  tasks,
  onView,
  onEdit,
  onDelete,
}) => {
  // Сортировка
  const [sortField, setSortField] = useState<SortField>('idx');
  const [sortAsc, setSortAsc] = useState(true);

  // Пагинация
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Диалог подтверждения удаления
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    taskId: number | null;
    taskTitle: string;
  }>({
    isOpen: false,
    taskId: null,
    taskTitle: '',
  });
  const [deleting, setDeleting] = useState(false);

  // Управление шириной колонок (Column Resizing)
  const defaultColWidths: Record<string, number> = {
    idx: 55,
    receiptDate: 105,
    plannedEndDate: 105,
    actualEndDate: 105,
    delayDays: 95,
    taskName: 240,
    taskDescription: 200,
    suidId: 105,
    authorName: 160,
    docTypeName: 90,
    projectCode: 95,
    projectName: 220,
    participatingDepts: 160,
    branchReports: 180,
    curatorNames: 150,
    notes: 160,
    actions: 110,
  };

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('suid_table_widths');
      return saved ? { ...defaultColWidths, ...JSON.parse(saved) } : defaultColWidths;
    } catch {
      return defaultColWidths;
    }
  });

  const latestColWidthsRef = useRef<Record<string, number>>(colWidths);
  latestColWidthsRef.current = colWidths;

  const totalTableWidth = useMemo(() => {
    return Object.values(colWidths).reduce((a, b) => a + b, 0);
  }, [colWidths]);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const initialScrollLeftRef = useRef<number>(0);

  const resizingCol = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
    direction: 'left' | 'right';
  } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingCol.current) return;
    const { colKey, startX, startWidth, direction } = resizingCol.current;
    const delta = direction === 'left' ? startX - e.clientX : e.clientX - startX;
    const minW = colKey === 'actions' ? 70 : 40;
    const newWidth = Math.max(minW, startWidth + delta);
    setColWidths((prev) => {
      const updated = { ...prev, [colKey]: newWidth };
      latestColWidthsRef.current = updated;
      return updated;
    });

    if (direction === 'left' && tableContainerRef.current) {
      const actualDelta = newWidth - startWidth;
      tableContainerRef.current.scrollLeft = initialScrollLeftRef.current + actualDelta;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingCol.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    try {
      localStorage.setItem('suid_table_widths', JSON.stringify(latestColWidthsRef.current));
    } catch {}
  }, [handleMouseMove]);

  const startResizing = (colKey: string, e: React.MouseEvent, direction: 'left' | 'right' = 'right') => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = {
      colKey,
      startX: e.clientX,
      startWidth: colWidths[colKey] || 120,
      direction,
    };
    if (direction === 'left' && tableContainerRef.current) {
      initialScrollLeftRef.current = tableContainerRef.current.scrollLeft;
    }
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Масштабирование окна таблицы
  const DEFAULT_TABLE_HEIGHT = 580;
  const [tableHeight, setTableHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('suid_table_height');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 240 && val <= 2500) return val;
      }
    } catch {}
    return DEFAULT_TABLE_HEIGHT;
  });

  const [tableWidth, setTableWidth] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('suid_table_width');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 380 && val <= 4000) return val;
      }
    } catch {}
    return null;
  });

  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizingTable, setIsResizingTable] = useState<'bottom' | 'right' | 'left' | 'corner-se' | 'corner-sw' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizingTable = useRef<{
    edge: 'bottom' | 'right' | 'left' | 'corner-se' | 'corner-sw';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const startResizingTable = (edge: 'bottom' | 'right' | 'left' | 'corner-se' | 'corner-sw', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMaximized || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    resizingTable.current = {
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };
    setIsResizingTable(edge);

    const handleTableMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingTable.current) return;
      const { edge: currentEdge, startX, startY, startWidth, startHeight } = resizingTable.current;

      if (currentEdge === 'bottom' || currentEdge === 'corner-se' || currentEdge === 'corner-sw') {
        const deltaY = moveEvent.clientY - startY;
        const newHeight = Math.max(200, Math.min(window.innerHeight - 40, startHeight + deltaY));
        setTableHeight(newHeight);
      }

      if (currentEdge === 'right' || currentEdge === 'corner-se') {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(480, startWidth + deltaX);
        setTableWidth(newWidth);
      } else if (currentEdge === 'left' || currentEdge === 'corner-sw') {
        const deltaX = startX - moveEvent.clientX;
        const newWidth = Math.max(480, startWidth + deltaX);
        setTableWidth(newWidth);
      }
    };

    const handleTableMouseUp = () => {
      setIsResizingTable(null);
      resizingTable.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleTableMouseMove);
      window.removeEventListener('mouseup', handleTableMouseUp);
      try {
        if (tableHeight) localStorage.setItem('suid_table_height', String(tableHeight));
        if (tableWidth) localStorage.setItem('suid_table_width', String(tableWidth));
      } catch {}
    };

    document.body.style.userSelect = 'none';
    if (edge === 'bottom') document.body.style.cursor = 'row-resize';
    else if (edge === 'right' || edge === 'left') document.body.style.cursor = 'col-resize';
    else if (edge === 'corner-se') document.body.style.cursor = 'nwse-resize';
    else if (edge === 'corner-sw') document.body.style.cursor = 'nesw-resize';

    window.addEventListener('mousemove', handleTableMouseMove);
    window.addEventListener('mouseup', handleTableMouseUp);
  };

  const handleResetTableSize = () => {
    setTableHeight(DEFAULT_TABLE_HEIGHT);
    setTableWidth(null);
    setColWidths(defaultColWidths);
    try {
      localStorage.removeItem('suid_table_height');
      localStorage.removeItem('suid_table_width');
      localStorage.removeItem('suid_table_widths');
    } catch {}
  };

  // Сортировка данных
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aVal = (a as any)[sortField] ?? '';
      const bVal = (b as any)[sortField] ?? '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }

      const cmp = String(aVal).localeCompare(String(bVal), 'ru', { numeric: true, sensitivity: 'base' });
      return sortAsc ? cmp : -cmp;
    });
  }, [tasks, sortField, sortAsc]);

  // Пагинация
  const totalPages = useMemo(() => Math.ceil(sortedTasks.length / pageSize) || 1, [sortedTasks.length, pageSize]);
  const paginatedTasks = useMemo(() => {
    return sortedTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [sortedTasks, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-500 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 text-blue-400 shrink-0 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400 shrink-0 ml-1" />
    );
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.taskId !== null && onDelete) {
      setDeleting(true);
      try {
        await onDelete(deleteDialog.taskId);
        setDeleteDialog({ isOpen: false, taskId: null, taskTitle: '' });
      } catch (e: any) {
        alert(`Ошибка удаления: ${e.message}`);
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <>
      {isMaximized && (
        <div
          className="fixed inset-0 z-45 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsMaximized(false)}
        />
      )}

      <div
        ref={containerRef}
        style={
          isMaximized
            ? undefined
            : {
                height: `${tableHeight}px`,
                width: tableWidth ? `${tableWidth}px` : '100%',
                maxWidth: '100%',
              }
        }
        className={`${
          isMaximized
            ? 'fixed inset-2 sm:inset-4 z-50 rounded-2xl shadow-2xl border border-blue-500/50'
            : 'relative rounded-2xl shadow-xl border border-[#2D3139]'
        } bg-[#171A21] flex flex-col overflow-hidden text-[#E0E0E0] ${
          isResizingTable ? 'transition-none select-none' : 'transition-all'
        }`}
      >
        {/* Шапка таблицы СУИД: синяя плашка идентичная DocumentTable */}
        <div
          id="suid-table-header"
          onDoubleClick={() => setIsMaximized((prev) => !prev)}
          title="Двойной клик разворачивает окно таблицы на весь экран или восстанавливает исходный размер"
          className="px-4 py-2.5 bg-blue-600 border-b border-blue-500/50 text-white flex flex-wrap items-center justify-between gap-2 shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-700/80 border border-blue-400/40 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h3
                id="suid-table-title"
                className="text-xs font-bold text-white tracking-wide uppercase truncate"
              >
                Работа в СУИД (Система Управления Инженерными Данными)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-700/80 text-white border border-blue-400/40 shrink-0">
                {tasks.length}
              </span>
            </div>
          </div>

          {/* Элементы управления масштабированием и размером окна таблицы */}
          <div className="flex items-center gap-1.5 text-xs text-blue-100 shrink-0">
            {tableWidth && (
              <button
                type="button"
                onClick={() => setTableWidth(null)}
                title="Растянуть таблицу на 100% ширины контейнера"
                className="px-2 py-1 rounded-md bg-blue-700/60 hover:bg-blue-700 text-[11px] text-white flex items-center gap-1 border border-blue-400/30 transition-colors cursor-pointer"
              >
                100% ширины
              </button>
            )}

            <button
              type="button"
              onClick={handleResetTableSize}
              title="Сбросить размеры таблицы и ширину колонок к значениям по умолчанию"
              className="p-1 rounded-md bg-blue-700/60 hover:bg-blue-700 text-white border border-blue-400/30 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Восстановить размер окна (Esc)' : 'Развернуть на весь экран'}
              className="p-1 rounded-md bg-blue-700/60 hover:bg-blue-700 text-white border border-blue-400/30 transition-colors cursor-pointer"
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Табличная часть с горизонтальной и вертикальной прокруткой */}
        <div
          ref={tableContainerRef}
          className="flex-1 overflow-auto bg-[#171A21] select-text scrollbar-thin"
        >
          <table
            style={{ width: `${totalTableWidth}px`, minWidth: '100%' }}
            className="border-collapse table-fixed text-left text-xs"
          >
            <colgroup>
              <col style={{ width: `${colWidths.idx}px` }} />
              <col style={{ width: `${colWidths.receiptDate}px` }} />
              <col style={{ width: `${colWidths.plannedEndDate}px` }} />
              <col style={{ width: `${colWidths.actualEndDate}px` }} />
              <col style={{ width: `${colWidths.delayDays}px` }} />
              <col style={{ width: `${colWidths.taskName}px` }} />
              <col style={{ width: `${colWidths.taskDescription}px` }} />
              <col style={{ width: `${colWidths.suidId}px` }} />
              <col style={{ width: `${colWidths.authorName}px` }} />
              <col style={{ width: `${colWidths.docTypeName}px` }} />
              <col style={{ width: `${colWidths.projectCode}px` }} />
              <col style={{ width: `${colWidths.projectName}px` }} />
              <col style={{ width: `${colWidths.participatingDepts}px` }} />
              <col style={{ width: `${colWidths.branchReports}px` }} />
              <col style={{ width: `${colWidths.curatorNames}px` }} />
              <col style={{ width: `${colWidths.notes}px` }} />
              <col style={{ width: `${colWidths.actions}px` }} />
            </colgroup>

            <thead className="sticky top-0 z-20 bg-[#1F222B] text-gray-300 shadow-sm border-b border-[#2D3139]">
              <tr className="divide-x divide-[#2D3139]">
                {/* № */}
                <th
                  onClick={() => handleSort('idx')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>№</span>
                    {renderSortIcon('idx')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('idx', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Дата поступления */}
                <th
                  onClick={() => handleSort('receiptDate')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Поступление</span>
                    {renderSortIcon('receiptDate')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('receiptDate', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Срок план */}
                <th
                  onClick={() => handleSort('plannedEndDate')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Срок план</span>
                    {renderSortIcon('plannedEndDate')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('plannedEndDate', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Срок факт */}
                <th
                  onClick={() => handleSort('actualEndDate')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Срок факт</span>
                    {renderSortIcon('actualEndDate')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('actualEndDate', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Просрочка */}
                <th
                  onClick={() => handleSort('delayDays')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="truncate">Просрочка</span>
                    {renderSortIcon('delayDays')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('delayDays', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Задача */}
                <th
                  onClick={() => handleSort('taskName')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Задача</span>
                    {renderSortIcon('taskName')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('taskName', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Описание задачи */}
                <th
                  onClick={() => handleSort('taskDescription')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Описание</span>
                    {renderSortIcon('taskDescription')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('taskDescription', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* ID в СУИД */}
                <th
                  onClick={() => handleSort('suidId')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">ID в СУИД</span>
                    {renderSortIcon('suidId')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('suidId', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Автор */}
                <th
                  onClick={() => handleSort('authorName')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Автор</span>
                    {renderSortIcon('authorName')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('authorName', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Тип документа */}
                <th
                  onClick={() => handleSort('docTypeName')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Тип док.</span>
                    {renderSortIcon('docTypeName')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('docTypeName', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Код проекта */}
                <th
                  onClick={() => handleSort('projectCode')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Код проекта</span>
                    {renderSortIcon('projectCode')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('projectCode', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Название проекта */}
                <th
                  onClick={() => handleSort('projectName')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Название проекта</span>
                    {renderSortIcon('projectName')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('projectName', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Структурные подразделения */}
                <th className="relative px-2.5 py-2.5 font-semibold select-none">
                  <span className="truncate">Подразделения</span>
                  <div
                    onMouseDown={(e) => startResizing('participatingDepts', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Наличие ежемесячного отчета */}
                <th className="relative px-2.5 py-2.5 font-semibold select-none">
                  <span className="truncate">Ежемесячный отчет</span>
                  <div
                    onMouseDown={(e) => startResizing('branchReports', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Куратор от ОПР */}
                <th
                  onClick={() => handleSort('curatorNames')}
                  className="relative px-2.5 py-2.5 font-semibold cursor-pointer hover:bg-[#282C37] transition-colors group select-none"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">Куратор от ОПР</span>
                    {renderSortIcon('curatorNames')}
                  </div>
                  <div
                    onMouseDown={(e) => startResizing('curatorNames', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Примечания */}
                <th className="relative px-2.5 py-2.5 font-semibold select-none">
                  <span className="truncate">Примечания</span>
                  <div
                    onMouseDown={(e) => startResizing('notes', e)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500 transition-colors"
                  />
                </th>

                {/* Действия */}
                <th className="relative px-2.5 py-2.5 font-semibold text-center select-none sticky right-0 bg-[#1F222B] z-30 shadow-l">
                  <span>Действия</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#2D3139] text-[#D0D4DC]">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-gray-500 opacity-50" />
                      <p className="text-sm font-medium">Нет записей СУИД, соответствующих критериям поиска</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((t, index) => {
                  const isDelay = t.delayDays > 0;
                  const rowBg = index % 2 === 0 ? 'bg-[#171A21]' : 'bg-[#1C1F28]';

                  return (
                    <tr
                      key={t.id}
                      className={`${rowBg} hover:bg-[#242834] transition-colors divide-x divide-[#2D3139]/50 group`}
                    >
                      {/* № */}
                      <td className="px-2.5 py-2 text-center font-mono text-gray-400">
                        {t.idx ?? t.id}
                      </td>

                      {/* Дата поступления */}
                      <td className="px-2.5 py-2 whitespace-nowrap text-gray-300 font-mono text-[11px]">
                        {formatDateRussian(t.receiptDate)}
                      </td>

                      {/* Срок план */}
                      <td className="px-2.5 py-2 whitespace-nowrap font-mono text-[11px] text-blue-300">
                        {formatDateRussian(t.plannedEndDate)}
                      </td>

                      {/* Срок факт */}
                      <td className="px-2.5 py-2 whitespace-nowrap font-mono text-[11px] text-emerald-300">
                        {formatDateRussian(t.actualEndDate) || <span className="text-gray-500">—</span>}
                      </td>

                      {/* Просрочка */}
                      <td className="px-2 py-2 text-center whitespace-nowrap">
                        {isDelay ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                            +{t.delayDays} дн.
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            0 дн.
                          </span>
                        )}
                      </td>

                      {/* Задача */}
                      <td className="px-2.5 py-2 text-white font-medium break-words">
                        <div className="line-clamp-2" title={t.taskName}>
                          {t.taskName}
                        </div>
                      </td>

                      {/* Описание задачи */}
                      <td className="px-2.5 py-2 text-gray-300 break-words text-[11px]">
                        <div className="line-clamp-2" title={t.taskDescription}>
                          {t.taskDescription || <span className="text-gray-500">—</span>}
                        </div>
                      </td>

                      {/* ID в СУИД */}
                      <td className="px-2.5 py-2 font-mono text-[11px] text-amber-300 whitespace-nowrap">
                        {t.suidId ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {t.suidId}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      {/* Автор */}
                      <td className="px-2.5 py-2 text-gray-300 text-[11px]">
                        <div className="truncate" title={t.authorName}>
                          {t.authorName || <span className="text-gray-500">—</span>}
                        </div>
                      </td>

                      {/* Тип документа */}
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        {t.docTypeName ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            {t.docTypeName}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      {/* Код проекта */}
                      <td className="px-2.5 py-2 font-mono text-[11px] whitespace-nowrap text-purple-300">
                        {t.projectCode ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/25">
                            {t.projectCode}
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      {/* Название проекта */}
                      <td className="px-2.5 py-2 text-gray-300 text-[11px] break-words">
                        <div className="line-clamp-2" title={t.projectName}>
                          {t.projectName || <span className="text-gray-500">—</span>}
                        </div>
                      </td>

                      {/* Структурные подразделения */}
                      <td className="px-2.5 py-2">
                        {t.participatingDepartments && t.participatingDepartments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.participatingDepartments.map((dept, dIdx) => (
                              <span
                                key={dIdx}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  dept.requiredReport
                                    ? 'bg-blue-900/30 text-blue-300 border-blue-500/30'
                                    : 'bg-gray-800 text-gray-400 border-gray-700'
                                }`}
                                title={dept.requiredReport ? `${dept.departmentShortName}: требуется отчет` : `${dept.departmentShortName}: без отчета`}
                              >
                                {dept.departmentShortName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Наличие ежемесячного отчета */}
                      <td className="px-2.5 py-2">
                        {t.isReportNotRequired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
                            <Ban className="w-2.5 h-2.5" />
                            Отчет не требуется
                          </span>
                        ) : t.branchReports && t.branchReports.length > 0 ? (
                          <div className="flex flex-col gap-1 max-w-[260px]">
                            {t.branchReports.map((br, brIdx) => (
                              <div
                                key={brIdx}
                                className="flex items-center gap-1.5 text-[10px] font-mono leading-tight bg-[#0F1115] px-1.5 py-0.5 rounded border border-[#2D3139]"
                                title={`${br.departmentShortName}: ${br.documentDetails || (br.isReceived ? 'Отчет получен' : 'Отчет отсутствует')}`}
                              >
                                {br.isReceived ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : (
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                                <span className="font-bold text-gray-300 shrink-0">{br.departmentShortName}:</span>
                                <span className="truncate text-gray-400">
                                  {br.documentDetails || (br.isReceived ? 'Отчет получен' : 'Ожидается')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-amber-400/80 text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Ожидается отчет
                          </span>
                        )}
                      </td>

                      {/* Куратор от ОПР */}
                      <td className="px-2.5 py-2 text-gray-300 text-[11px]">
                        <div className="truncate" title={t.curatorNames}>
                          {t.curatorNames || <span className="text-gray-500">—</span>}
                        </div>
                      </td>

                      {/* Примечания */}
                      <td className="px-2.5 py-2 text-gray-400 text-[11px]">
                        <div className="line-clamp-2" title={t.notes}>
                          {t.notes || <span className="text-gray-500">—</span>}
                        </div>
                      </td>

                      {/* Действия */}
                      <td className="px-2.5 py-2 text-center whitespace-nowrap sticky right-0 bg-[#1F222B] z-10 shadow-l">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onView && onView(t)}
                            title="Просмотреть карточку задачи СУИД"
                            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-blue-600/30 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit && onEdit(t)}
                            title="Редактировать запись СУИД"
                            className="p-1 rounded-md text-gray-400 hover:text-blue-400 hover:bg-blue-600/30 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteDialog({ isOpen: true, taskId: t.id, taskTitle: t.taskName })}
                            title="Удалить запись"
                            className="p-1 rounded-md text-gray-400 hover:text-rose-400 hover:bg-rose-600/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Подвал таблицы: пагинация и статистика */}
        <div
          id="suid-table-footer"
          className="px-4 py-2 bg-[#1A1D24] border-t border-[#2D3139] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 select-none shrink-0"
        >
          <div className="flex items-center gap-3">
            <span>
              Показано {paginatedTasks.length} из {tasks.length} записей
            </span>
            <div className="flex items-center gap-1.5">
              <span>Строк:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-[#0F1115] border border-[#2D3139] rounded px-1.5 py-0.5 text-xs text-gray-300 focus:outline-hidden focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              title="Первая страница"
              className="p-1 rounded bg-[#0F1115] border border-[#2D3139] hover:bg-[#252831] disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Предыдущая страница"
              className="p-1 rounded bg-[#0F1115] border border-[#2D3139] hover:bg-[#252831] disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-gray-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Следующая страница"
              className="p-1 rounded bg-[#0F1115] border border-[#2D3139] hover:bg-[#252831] disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Последняя страница"
              className="p-1 rounded bg-[#0F1115] border border-[#2D3139] hover:bg-[#252831] disabled:opacity-30 disabled:cursor-not-allowed text-gray-300"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ручки изменения размеров границ окна таблицы мышью */}
        {!isMaximized && (
          <>
            <div
              onMouseDown={(e) => startResizingTable('bottom', e)}
              className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize hover:bg-blue-500/50 transition-colors z-40"
              title="Потяните для изменения высоты таблицы"
            />
            <div
              onMouseDown={(e) => startResizingTable('right', e)}
              className="absolute top-0 bottom-0 right-0 w-2 cursor-col-resize hover:bg-blue-500/50 transition-colors z-40"
              title="Потяните для изменения ширины таблицы"
            />
            <div
              onMouseDown={(e) => startResizingTable('left', e)}
              className="absolute top-0 bottom-0 left-0 w-2 cursor-col-resize hover:bg-blue-500/50 transition-colors z-40"
              title="Потяните для изменения ширины таблицы"
            />
            <div
              onMouseDown={(e) => startResizingTable('corner-se', e)}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-blue-500 transition-colors z-50 flex items-center justify-center text-gray-500 hover:text-white"
              title="Потяните угол для масштабирования таблицы"
            >
              <MoveDiagonal className="w-3 h-3 rotate-90" />
            </div>
          </>
        )}
      </div>

      {/* Диалог подтверждения удаления */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#1F222B] border border-[#2D3139] rounded-xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Удаление записи СУИД</h3>
            </div>
            <p className="text-xs text-gray-300 mb-4">
              Вы действительно хотите удалить задачу:
              <br />
              <strong className="text-white mt-1 block font-medium break-words">
                «{deleteDialog.taskTitle}»
              </strong>
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteDialog({ isOpen: false, taskId: null, taskTitle: '' })}
                className="px-3.5 py-1.5 rounded-lg border border-[#2D3139] text-gray-300 hover:bg-[#2B2F3B] text-xs font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
