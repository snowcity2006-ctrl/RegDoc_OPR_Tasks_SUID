import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Layers,
  Save,
  Calendar,
  AlertTriangle,
  Building2,
  Users,
  User,
  Tag,
  FileCheck2,
  FileText,
  Ban,
  Clock,
  Plus,
} from 'lucide-react';
import {
  SuidTaskRecord,
  DocumentType,
  Project,
  Department,
  Employee,
  SuidBranchReport,
  SuidParticipatingDepartment,
} from '../../types';
import { SearchableMultiSelect, MultiSelectOption } from '../documents/SearchableMultiSelect';
import { SearchableCombobox, ComboboxOption } from '../documents/SearchableCombobox';
import { getLocalTodayDateString } from '../../utils/taskUtils';

interface SuidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<SuidTaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>;
  task?: SuidTaskRecord | null;
  documentTypes: DocumentType[];
  projects: Project[];
  departments: Department[];
  employees: Employee[];
}

export const SuidModal: React.FC<SuidModalProps> = ({
  isOpen,
  onClose,
  onSave,
  task,
  documentTypes,
  projects,
  departments,
  employees,
}) => {
  const [idx, setIdx] = useState<number>(1);
  const [receiptDate, setReceiptDate] = useState<string>('');
  const [plannedEndDate, setPlannedEndDate] = useState<string>('');
  const [actualEndDate, setActualEndDate] = useState<string>('');
  const [taskName, setTaskName] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [suidId, setSuidId] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('');
  const [authorEmployeeId, setAuthorEmployeeId] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');

  // 1.2.1 Тип документа
  const [docTypeId, setDocTypeId] = useState<number | null>(null);
  const [docTypeName, setDocTypeName] = useState<string>('');

  // 1.2.2 Проект (Код и название)
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectCode, setProjectCode] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');

  // 1.2.3 Структурные подразделения и "Отчет не требуется"
  const [selectedDeptShortNames, setSelectedDeptShortNames] = useState<string[]>([]);
  // Подразделения, для которых явно отмечен чекбокс "Требуется ежемесячный отчет" (п. 1.2.3)
  const [requiredReportDeptShortNames, setRequiredReportDeptShortNames] = useState<string[]>([]);
  const [isReportNotRequired, setIsReportNotRequired] = useState<boolean>(false);

  // 1.2.4 Куратор от ОПР (мультивыбор)
  const [selectedCuratorIds, setSelectedCuratorIds] = useState<number[]>([]);

  // 1.2.5 Наличие ежемесячного отчета (по выбранным подразделениям)
  // map: deptShortName -> { isReceived: boolean, documentDetails: string }
  const [branchReportsMap, setBranchReportsMap] = useState<Record<string, { isReceived: boolean; documentDetails: string }>>({});

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Инициализация при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (task) {
        setIdx(task.idx ?? task.id);
        setReceiptDate(task.receiptDate || '');
        setPlannedEndDate(task.plannedEndDate || '');
        setActualEndDate(task.actualEndDate || '');
        const cleanName = task.taskName ? task.taskName.replace(/\s*\[.*?\]\s*/g, ' ').replace(/\s*\(.*?\)\s*/g, ' ').trim() : '';
        setTaskName(cleanName);
        setTaskDescription(task.taskDescription || '');
        setSuidId(task.suidId || '');
        const currentAuthor = task.authorName || '';
        setAuthorName(currentAuthor);
        const matchEmp = employees.find(
          (emp) => emp.fullName.trim().toLowerCase() === currentAuthor.trim().toLowerCase()
        );
        setAuthorEmployeeId(matchEmp ? matchEmp.id : '');
        setNotes(task.notes || '');

        setDocTypeId(task.docTypeId || null);
        setDocTypeName(task.docTypeName || '');

        setProjectId(task.projectId || null);
        setProjectCode(task.projectCode || '');
        setProjectName(task.projectName || '');

        const depts = (task.participatingDepartments || []).map((d) => d.departmentShortName);
        setSelectedDeptShortNames(depts);
        // Загружаем список подразделений, для которых требуется отчет
        const requiredDepts = (task.participatingDepartments || [])
          .filter((d) => d.requiredReport !== false)
          .map((d) => d.departmentShortName);
        setRequiredReportDeptShortNames(requiredDepts);
        setIsReportNotRequired(Boolean(task.isReportNotRequired));

        const reportsMap: Record<string, { isReceived: boolean; documentDetails: string }> = {};
        (task.branchReports || []).forEach((br) => {
          reportsMap[br.departmentShortName] = {
            isReceived: Boolean(br.isReceived),
            documentDetails: br.documentDetails || '',
          };
        });
        setBranchReportsMap(reportsMap);

        setSelectedCuratorIds(task.curatorEmployeeIds || []);
      } else {
        const today = getLocalTodayDateString();
        setIdx(1);
        setReceiptDate(today);
        setPlannedEndDate(today);
        setActualEndDate('');
        setTaskName('');
        setTaskDescription('');
        setSuidId('');
        setAuthorName('');
        setAuthorEmployeeId('');
        setNotes('');

        setDocTypeId(null);
        setDocTypeName('');

        setProjectId(null);
        setProjectCode('');
        setProjectName('');

        setSelectedDeptShortNames([]);
        setRequiredReportDeptShortNames([]);
        setIsReportNotRequired(false);
        setBranchReportsMap({});
        setSelectedCuratorIds([]);
      }
    }
  }, [isOpen, task]);

  // 1.2.1 Обработка изменения типа документа
  const handleDocTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : null;
    setDocTypeId(val);
    if (val) {
      const found = documentTypes.find((dt) => dt.id === val);
      setDocTypeName(found ? found.name : '');
    } else {
      setDocTypeName('');
    }
  };

  // 1.2.2 Обработка выбора проекта: заполняет и код, и название
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : null;
    setProjectId(val);
    if (val) {
      const found = projects.find((pr) => pr.id === val);
      if (found) {
        setProjectCode(found.code || '');
        setProjectName(found.name || '');
      }
    } else {
      setProjectCode('');
      setProjectName('');
    }
  };

  // 1.2.3 Опции для выпадающего списка подразделений с поиском
  const departmentOptions: MultiSelectOption<string>[] = useMemo(() => {
    return departments.map((d) => ({
      id: d.shortName,
      label: d.shortName,
      subLabel: d.name || undefined,
      badge: d.organizationName || undefined,
      searchStr: `${d.shortName} ${d.name || ''} ${d.organizationName || ''}`,
    }));
  }, [departments]);

  const handleDepartmentsChange = (newShortNames: string[]) => {
    // Определяем добавленные подразделения
    const addedShortNames = newShortNames.filter((name) => !selectedDeptShortNames.includes(name));
    setSelectedDeptShortNames(newShortNames);

    // По умолчанию при выборе подразделения чекбокс "Требуется ежемесячный отчет" активен
    setRequiredReportDeptShortNames((prev) => {
      const next = prev.filter((name) => newShortNames.includes(name));
      addedShortNames.forEach((name) => {
        if (!next.includes(name)) {
          next.push(name);
        }
      });
      return next;
    });

    setBranchReportsMap((prev) => {
      const nextMap = { ...prev };
      newShortNames.forEach((shortName) => {
        if (!nextMap[shortName]) {
          nextMap[shortName] = { isReceived: false, documentDetails: '' };
        }
      });
      return nextMap;
    });
  };

  // Переключение чекбокса "Требуется ежемесячный отчет" для подразделения
  const toggleRequiredReport = (deptShortName: string, isRequired: boolean) => {
    setRequiredReportDeptShortNames((prev) => {
      if (isRequired) {
        return prev.includes(deptShortName) ? prev : [...prev, deptShortName];
      } else {
        return prev.filter((name) => name !== deptShortName);
      }
    });

    // Инициализируем запись в branchReportsMap при включении, если ее еще нет
    if (isRequired) {
      setBranchReportsMap((prev) => {
        if (!prev[deptShortName]) {
          return {
            ...prev,
            [deptShortName]: { isReceived: false, documentDetails: '' },
          };
        }
        return prev;
      });
    }
  };

  // Опции для выпадающего списка выбора автора задачи из справочника «Сотрудники» с поиском по части слова
  const authorOptions: ComboboxOption[] = useMemo(() => {
    return employees.map((emp) => ({
      id: emp.id,
      label: emp.fullName,
      subLabel: emp.position
        ? `${emp.position}${emp.departmentShortName ? ` • СП: ${emp.departmentShortName}` : ''}`
        : (emp.departmentShortName ? `СП: ${emp.departmentShortName}` : undefined),
      badge: emp.departmentShortName || undefined,
      searchStr: `${emp.fullName} ${emp.position || ''} ${emp.departmentShortName || ''}`,
    }));
  }, [employees]);

  const handleAuthorChange = (selectedId: number | '') => {
    setAuthorEmployeeId(selectedId);
    if (selectedId === '') {
      setAuthorName('');
    } else {
      const found = employees.find((e) => e.id === selectedId);
      if (found) {
        setAuthorName(found.fullName);
      }
    }
  };

  const handleCustomAuthorChange = (customVal: string) => {
    setAuthorName(customVal);
    const found = employees.find(
      (e) => e.fullName.trim().toLowerCase() === customVal.trim().toLowerCase()
    );
    setAuthorEmployeeId(found ? found.id : '');
  };

  // 1.2.4 Опции для выпадающего списка кураторов от ОПР с поиском
  const curatorOptions: MultiSelectOption<number>[] = useMemo(() => {
    return employees.map((emp) => ({
      id: emp.id,
      label: emp.fullName,
      subLabel: emp.position || undefined,
      badge: emp.departmentShortName || undefined,
      searchStr: `${emp.fullName} ${emp.position || ''} ${emp.departmentShortName || ''}`,
    }));
  }, [employees]);

  // 1.2.5 Обработка статуса и реквизитов отчета для подразделения
  const handleReportReceivedChange = (deptShortName: string, isReceived: boolean) => {
    setBranchReportsMap((prev) => ({
      ...prev,
      [deptShortName]: {
        isReceived,
        // Если чекбокс снимается, содержимое стирается
        documentDetails: isReceived ? prev[deptShortName]?.documentDetails || '' : '',
      },
    }));
  };

  const handleReportDetailsChange = (deptShortName: string, documentDetails: string) => {
    setBranchReportsMap((prev) => ({
      ...prev,
      [deptShortName]: {
        isReceived: prev[deptShortName]?.isReceived || false,
        documentDetails,
      },
    }));
  };

  // Расчет просрочки в днях
  const calculatedDelay = useMemo(() => {
    if (!plannedEndDate) return 0;
    const pParts = plannedEndDate.split('-').map(Number);
    if (pParts.length !== 3) return 0;
    const utcP = Date.UTC(pParts[0], pParts[1] - 1, pParts[2]);

    if (actualEndDate) {
      const aParts = actualEndDate.split('-').map(Number);
      if (aParts.length !== 3) return 0;
      const utcA = Date.UTC(aParts[0], aParts[1] - 1, aParts[2]);
      const diff = Math.round((utcA - utcP) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } else {
      const todayStr = getLocalTodayDateString();
      const tParts = todayStr.split('-').map(Number);
      if (tParts.length !== 3) return 0;
      const utcT = Date.UTC(tParts[0], tParts[1] - 1, tParts[2]);
      const diff = Math.round((utcT - utcP) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    }
  }, [plannedEndDate, actualEndDate]);

  // Сохранение
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!taskName.trim()) {
      setError('Пожалуйста, укажите наименование задачи');
      return;
    }

    setSaving(true);
    try {
      // Формируем список структурных подразделений
      const participatingDepartments: SuidParticipatingDepartment[] = selectedDeptShortNames.map((d) => ({
        departmentShortName: d,
        requiredReport: !isReportNotRequired && requiredReportDeptShortNames.includes(d),
      }));

      // Формируем перечень ежемесячных отчетов (только для подразделений, у которых включен чекбокс "Требуется ежемесячный отчет")
      const branchReports: SuidBranchReport[] = isReportNotRequired
        ? []
        : selectedDeptShortNames
            .filter((d) => requiredReportDeptShortNames.includes(d))
            .map((d) => ({
              departmentShortName: d,
              isReceived: Boolean(branchReportsMap[d]?.isReceived),
              documentDetails: branchReportsMap[d]?.documentDetails || '',
            }));

      // Формируем строку кураторов
      const curatorNames = selectedCuratorIds
        .map((cid) => employees.find((emp) => emp.id === cid)?.fullName)
        .filter(Boolean)
        .join(', ');

      await onSave({
        id: task?.id,
        idx,
        receiptDate,
        plannedEndDate,
        actualEndDate,
        delayDays: calculatedDelay,
        taskName: taskName.trim(),
        taskDescription: taskDescription.trim(),
        suidId: suidId.trim(),
        authorName: authorName.trim(),
        docTypeId: docTypeId || undefined,
        docTypeName,
        projectId: projectId || undefined,
        projectCode,
        projectName,
        notes: notes.trim(),
        participatingDepartments,
        branchReports,
        isReportNotRequired,
        curatorEmployeeIds: selectedCuratorIds,
        curatorNames,
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения записи СУИД');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#171A21] border border-[#2D3139] rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Шапка модального окна */}
        <div className="px-5 py-3.5 bg-blue-600 border-b border-blue-500/50 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700/80 border border-blue-400/40 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="suid-modal-title"
                className="text-sm font-bold uppercase tracking-wider !text-white text-white"
                style={{ color: '#ffffff' }}
              >
                {task ? `Редактирование задачи СУИД №${task.idx ?? task.id}` : 'Новая запись в СУИД'}
              </h2>
              <p className="text-[11px] text-blue-100/80">
                Система Управления Инженерными Данными
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-700/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Тело формы */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Блок 1: Основные сведения, ID в СУИД, Тип документа и даты (в одну строчку, гарантированная видимость всех элементов) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1.35fr_1.1fr_1.1fr_1.1fr_0.95fr] items-end gap-2.5 bg-[#1F222B]/60 p-3 rounded-xl border border-[#2D3139] w-full min-w-0">
            {/* 1. Идентификатор в СУИД */}
            <div className="min-w-0 w-full">
              <label className="text-[11px] text-amber-300 font-medium block mb-1 truncate" title="Идентификатор в СУИД">
                ID в СУИД
              </label>
              <input
                type="text"
                value={suidId}
                onChange={(e) => setSuidId(e.target.value)}
                placeholder="1467806"
                className="w-full h-9 px-2.5 bg-[#0F1115] border border-[#2D3139] rounded-lg text-amber-300 font-mono text-xs placeholder-gray-400 focus:outline-hidden focus:border-blue-500 transition-colors"
              />
            </div>

            {/* 2. Тип документа */}
            <div className="min-w-0 w-full">
              <label className="text-[11px] text-blue-400 font-medium flex items-center gap-1 mb-1 truncate" title="Тип документа">
                <Tag className="w-3 h-3 shrink-0" />
                <span className="truncate">Тип документа</span>
              </label>
              <select
                value={docTypeId ?? ''}
                onChange={handleDocTypeChange}
                className="w-full h-9 px-2 bg-[#0F1115] border border-[#2D3139] rounded-lg text-white text-xs focus:outline-hidden focus:border-blue-500 truncate cursor-pointer transition-colors"
              >
                <option value="">-- Выберите --</option>
                {documentTypes.map((dt) => (
                  <option key={dt.id} value={dt.id}>
                    {dt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Дата поступления */}
            <div className="min-w-0 w-full">
              <label className="text-[11px] text-gray-300 font-medium block mb-1 truncate" title="Дата поступления">
                Поступление
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full h-9 px-2 bg-[#0F1115] border border-[#2D3139] rounded-lg text-white text-xs focus:outline-hidden focus:border-blue-500 font-mono [color-scheme:dark] transition-colors"
              />
            </div>

            {/* 4. Срок план */}
            <div className="min-w-0 w-full">
              <label className="text-[11px] text-blue-400 font-medium block mb-1 truncate" title="Срок план">
                Срок план
              </label>
              <input
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="w-full h-9 px-2 bg-[#0F1115] border border-[#2D3139] rounded-lg text-white text-xs focus:outline-hidden focus:border-blue-500 font-mono [color-scheme:dark] transition-colors"
              />
            </div>

            {/* 5. Срок факт */}
            <div className="min-w-0 w-full">
              <label className="text-[11px] text-emerald-400 font-medium block mb-1 truncate" title="Срок факт">
                Срок факт
              </label>
              <input
                type="date"
                value={actualEndDate}
                onChange={(e) => setActualEndDate(e.target.value)}
                className="w-full h-9 px-2 bg-[#0F1115] border border-[#2D3139] rounded-lg text-white text-xs focus:outline-hidden focus:border-blue-500 font-mono [color-scheme:dark] transition-colors"
              />
            </div>

            {/* 6. Просрочка (расчет) */}
            <div className="min-w-0 w-full">
              <label
                className="text-[11px] text-gray-300 font-medium block mb-1 truncate"
                title="Просрочка"
              >
                Просрочка
              </label>
              <div
                className={`w-full h-9 px-2 rounded-lg border font-mono font-semibold text-xs flex items-center justify-between ${
                  calculatedDelay > 0
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}
                title={calculatedDelay > 0 ? `Просрочка исполнения: ${calculatedDelay} дней` : 'Исполнено в срок'}
              >
                <span className="truncate">{calculatedDelay > 0 ? `+${calculatedDelay} дн.` : '0 дн.'}</span>
                {calculatedDelay > 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1" />}
              </div>
            </div>
          </div>

          {/* Блок 2: Наименование и описание задачи */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-gray-300 font-medium block mb-1">
                Наименование задачи <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Например: 41.2.5 Рассмотрение комплекта РД"
                className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white placeholder-gray-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-300 font-medium block mb-1">
                Краткое описание задачи
              </label>
              <textarea
                rows={2}
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Например: Рассмотрение РД или Корректировка изм. к ТТ"
                className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white placeholder-gray-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Блок 3: Автор задачи и Куратор от ОПР (в одну строчку) */}
          <div className="bg-[#1F222B]/60 p-3.5 rounded-xl border border-[#2D3139]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
              {/* 1. Автор задачи (выпадающий список с возможностью поиска по части слова из справочника «Сотрудники») */}
              <div>
                <label className="text-[11px] text-gray-300 font-medium flex items-center gap-1 mb-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Автор задачи
                </label>
                <SearchableCombobox
                  id="suid-author-combobox"
                  inputId="input-suid-author-name"
                  options={authorOptions}
                  value={authorEmployeeId}
                  onChange={handleAuthorChange}
                  allowCustomValue={true}
                  customValue={authorName}
                  onCustomValueChange={handleCustomAuthorChange}
                  placeholder="-- Начните вводить ФИО или выберите автора --"
                  emptyMessage="Сотрудники не найдены"
                />
              </div>

              {/* 2. Куратор от ОПР (выпадающий список с возможностью набора текста) */}
              <div>
                <SearchableMultiSelect
                  id="suid-curators-select"
                  label="Куратор от ОПР"
                  icon={<Users className="w-3.5 h-3.5 text-emerald-400" />}
                  options={curatorOptions}
                  selectedIds={selectedCuratorIds}
                  onChange={setSelectedCuratorIds}
                  placeholder="-- Начните вводить ФИО или выберите куратора из списка --"
                  emptyMessage="Сотрудники не найдены"
                  chipColor="emerald"
                />
              </div>
            </div>
          </div>

          {/* Блок 4 (1.2.2): Проект из справочника "Проекты" */}
          <div className="bg-[#1F222B]/60 p-3.5 rounded-xl border border-[#2D3139]">
            <label className="text-[11px] text-purple-400 font-medium flex items-center gap-1 mb-1.5">
              <Layers className="w-3.5 h-3.5" />
              Проект
            </label>
            <select
              value={projectId ?? ''}
              onChange={handleProjectChange}
              className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white focus:outline-hidden focus:border-blue-500"
            >
              <option value="">-- Выберите проект из реестра --</option>
              {projects.map((pr) => (
                <option key={pr.id} value={pr.id}>
                  {pr.code ? `${pr.code} • ` : ''}{pr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Блок 6 (1.2.3): Структурные подразделения (выпадающий список с возможностью набора текста) */}
          <div className="bg-[#1F222B]/60 p-3.5 rounded-xl border border-[#2D3139]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-400 font-medium">
                  Структурные подразделения
                </span>
              </div>

              {/* Чекбокс: Отчет не требуется */}
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F1115] border border-[#2D3139] text-gray-300 cursor-pointer hover:border-blue-500 transition-colors">
                <input
                  type="checkbox"
                  checked={isReportNotRequired}
                  onChange={(e) => setIsReportNotRequired(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <Ban className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-medium">Отчет не требуется</span>
              </label>
            </div>

            <p className="text-[10px] text-gray-400 mb-2.5">
              * При выборе подразделения отметьте чекбокс «Требуется ежемесячный отчет», чтобы добавить подразделение в перечень ежемесячного отчета.
            </p>

            <SearchableMultiSelect<string>
              id="suid-departments-select"
              label="Участвующие подразделения"
              icon={<Building2 className="w-3.5 h-3.5 text-amber-400" />}
              options={departmentOptions}
              selectedIds={selectedDeptShortNames}
              onChange={handleDepartmentsChange}
              placeholder="-- Начните вводить шифр или наименование подразделения --"
              emptyMessage="Подразделения не найдены"
              chipColor="amber"
              renderItemExtra={(opt, isSelected) => {
                if (!isSelected) return null;
                const isRequired = requiredReportDeptShortNames.includes(opt.id);
                return (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer select-none transition-colors ${
                      isRequired
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950/60'
                        : 'bg-[#171A21] text-gray-400 border-[#2D3139] hover:text-gray-200'
                    }`}
                    title="При выборе подразделение копируется в список структурных подразделений для ежемесячного отчета"
                  >
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => toggleRequiredReport(opt.id, e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                    />
                    <span className="whitespace-nowrap">Требуется ежемесячный отчет</span>
                  </label>
                );
              }}
              renderChipExtra={(opt) => {
                const isRequired = requiredReportDeptShortNames.includes(opt.id);
                return (
                  <label
                    onClick={(e) => e.stopPropagation()}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] cursor-pointer select-none transition-colors border ${
                      isRequired
                        ? 'bg-emerald-900/50 text-emerald-300 border-emerald-500/40'
                        : 'bg-[#171A21]/70 text-gray-400 border-gray-700/60 hover:text-gray-200'
                    }`}
                    title={
                      isRequired
                        ? 'Отчет требуется: подразделение включено в перечень ежемесячного отчета'
                        : 'Нажмите, чтобы потребовать ежемесячный отчет от этого подразделения'
                    }
                  >
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => toggleRequiredReport(opt.id, e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-3 h-3"
                    />
                    <span className="whitespace-nowrap">Ежемес. отчет</span>
                  </label>
                );
              }}
            />
          </div>

          {/* Блок 7 (1.2.5): Наличие ежемесячного отчета */}
          <div className="bg-[#1F222B]/60 p-3.5 rounded-xl border border-[#2D3139]">
            <label className="text-[11px] text-teal-400 font-medium flex items-center gap-1.5 mb-2">
              <FileCheck2 className="w-3.5 h-3.5" />
              Наличие ежемесячного отчета
            </label>

            {isReportNotRequired ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2">
                <Ban className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="font-medium">
                  Отчет по данной задаче не требуется
                </span>
              </div>
            ) : selectedDeptShortNames.length === 0 ? (
              <div className="p-3 rounded-xl bg-[#0F1115] border border-[#2D3139] text-gray-400 text-center">
                Выберите участвующие подразделения выше в блоке «Структурные подразделения», чтобы сформировать список филиалов для ежемесячного отчета
              </div>
            ) : requiredReportDeptShortNames.length === 0 ? (
              <div className="p-3 rounded-xl bg-[#0F1115] border border-[#2D3139] text-amber-300/80 text-center text-xs">
                Среди выбранных структурных подразделений не отмечен чекбокс «Требуется ежемесячный отчет». Отметьте чекбокс у нужных подразделений выше, чтобы они скопировались в этот список.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="text-[11px] text-gray-400 mb-1">
                  Список структурных подразделений, от которых требуется получение ежемесячного отчета:
                </div>

                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {selectedDeptShortNames
                    .filter((dShortName) => requiredReportDeptShortNames.includes(dShortName))
                    .map((dShortName) => {
                    const report = branchReportsMap[dShortName] || { isReceived: false, documentDetails: '' };

                    return (
                      <div
                        key={dShortName}
                        className="flex flex-col sm:flex-row sm:items-center gap-2.5 p-2.5 rounded-xl bg-[#0F1115] border border-[#2D3139]"
                      >
                        <div className="flex items-center gap-2 min-w-[110px]">
                          <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-blue-900/40 text-blue-300 border border-blue-500/30">
                            {dShortName}
                          </span>
                        </div>

                        {/* Чекбокс "Отчет получен" */}
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer shrink-0 select-none">
                          <input
                            type="checkbox"
                            checked={report.isReceived}
                            onChange={(e) => handleReportReceivedChange(dShortName, e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-0 cursor-pointer"
                          />
                          <span className={report.isReceived ? 'text-emerald-400 font-semibold' : 'text-gray-400'}>
                            {report.isReceived ? 'Отчет получен' : 'Отчет отсутствует'}
                          </span>
                        </label>

                        {/* Текстовое поле для реквизитов */}
                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="text"
                            value={report.documentDetails}
                            disabled={!report.isReceived}
                            onChange={(e) => handleReportDetailsChange(dShortName, e.target.value)}
                            placeholder={
                              report.isReceived
                                ? "Реквизиты документа, например: СЗ 18/203-870 от 02.02.2026"
                                : "Ввод доступен только при установке флага «Отчет получен»"
                            }
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono transition-colors focus:outline-hidden ${
                              report.isReceived
                                ? 'bg-[#171A21] border-[#2D3139] text-white placeholder-gray-500 focus:border-blue-500'
                                : 'bg-[#12141A] border-[#23262E] text-gray-600 placeholder-gray-600 cursor-not-allowed opacity-60'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Блок 8: Примечания */}
          <div>
            <label className="text-[11px] text-gray-300 font-medium block mb-1">
              Примечания
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительные комментарии, заметки по задаче СУИД..."
              className="w-full px-3 py-2 bg-[#0F1115] border border-[#2D3139] rounded-xl text-white placeholder-gray-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Подвал с кнопками */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2D3139] mt-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#2D3139] text-gray-300 hover:bg-[#1F222B] text-xs font-medium cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Сохранение...' : task ? 'Сохранить изменения' : 'Создать запись'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
