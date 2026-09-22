import React from 'react';
import {
  X,
  Layers,
  Calendar,
  AlertTriangle,
  Building2,
  Users,
  Tag,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  Copy,
  Check,
  Edit2,
} from 'lucide-react';
import { SuidTaskRecord } from '../../types';
import { formatDateRussian } from '../../utils/date';

interface SuidDetailModalProps {
  task: SuidTaskRecord | null;
  onClose: () => void;
  onEdit?: (task: SuidTaskRecord) => void;
}

export const SuidDetailModal: React.FC<SuidDetailModalProps> = ({
  task,
  onClose,
  onEdit,
}) => {
  const [copiedId, setCopiedId] = React.useState(false);

  if (!task) return null;

  const handleCopySuidId = () => {
    if (task.suidId) {
      navigator.clipboard.writeText(task.suidId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const isDelay = task.delayDays > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#171A21] border border-[#2D3139] rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Шапка */}
        <div className="px-5 py-3.5 bg-blue-600 border-b border-blue-500/50 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700/80 border border-blue-400/40 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="suid-detail-modal-title"
                  className="text-sm font-bold uppercase tracking-wider !text-white text-white"
                  style={{ color: '#ffffff' }}
                >
                  Карточка задачи СУИД №{task.idx ?? task.id}
                </h2>
                {task.docTypeName && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-800/80 border border-blue-400/40 text-white">
                    {task.docTypeName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-100/80">
                Система Управления Инженерными Данными
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-700/80 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 border border-blue-400/30 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Редактировать</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-700/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Содержимое */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
          {/* Сроки и статус выполнения */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-[#1F222B]/60 border border-[#2D3139]">
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Поступление</div>
              <div className="font-mono text-xs font-semibold text-gray-200 mt-0.5">
                {formatDateRussian(task.receiptDate) || '—'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-blue-400 uppercase tracking-wider">Срок план</div>
              <div className="font-mono text-xs font-semibold text-blue-300 mt-0.5">
                {formatDateRussian(task.plannedEndDate) || '—'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Срок факт</div>
              <div className="font-mono text-xs font-semibold text-emerald-300 mt-0.5">
                {formatDateRussian(task.actualEndDate) || '—'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Просрочка</div>
              <div className="mt-0.5">
                {isDelay ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    +{task.delayDays} дн.
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    0 дн. (В срок)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Наименование и описание */}
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-medium text-gray-400 mb-1">Наименование задачи:</div>
              <div className="p-3 rounded-xl bg-[#0F1115] border border-[#2D3139] text-white font-medium text-sm leading-relaxed">
                {task.taskName}
              </div>
            </div>

            {task.taskDescription && (
              <div>
                <div className="text-[11px] font-medium text-gray-400 mb-1">Краткое описание:</div>
                <div className="p-3 rounded-xl bg-[#0F1115] border border-[#2D3139] text-gray-300 leading-relaxed">
                  {task.taskDescription}
                </div>
              </div>
            )}
          </div>

          {/* Атрибуты: ID в СУИД, Автор, Проект */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#0F1115] border border-[#2D3139] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 uppercase">ID в СУИД</div>
                <div className="text-amber-300 font-mono text-sm font-bold mt-0.5">
                  {task.suidId || '—'}
                </div>
              </div>
              {task.suidId && (
                <button
                  type="button"
                  onClick={handleCopySuidId}
                  title="Скопировать ID в буфер обмена"
                  className="p-1.5 rounded-lg border border-[#2D3139] text-gray-400 hover:text-white hover:bg-[#1F222B] transition-colors cursor-pointer"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-[#0F1115] border border-[#2D3139]">
              <div className="text-[10px] text-gray-400 uppercase">Автор задачи</div>
              <div className="text-gray-200 font-medium mt-0.5">
                {task.authorName || '—'}
              </div>
            </div>
          </div>

          {/* Проект */}
          <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#2D3139]">
            <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1">
              Проект
            </div>
            <div className="flex items-baseline gap-2">
              {task.projectCode && (
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {task.projectCode}
                </span>
              )}
              <span className="text-gray-200 font-medium">
                {task.projectName || '—'}
              </span>
            </div>
          </div>

          {/* Куратор от ОПР */}
          <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#2D3139]">
            <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">
              Куратор от ОПР
            </div>
            <div className="text-gray-200 font-medium">
              {task.curatorNames || '—'}
            </div>
          </div>

          {/* Структурные подразделения */}
          <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#2D3139]">
            <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider mb-2">
              Структурные подразделения
            </div>
            {task.participatingDepartments && task.participatingDepartments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {task.participatingDepartments.map((dept, dIdx) => (
                  <span
                    key={dIdx}
                    className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-900/30 text-blue-300 border border-blue-500/30"
                  >
                    {dept.departmentShortName}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-gray-400">Подразделения не назначены</div>
            )}
          </div>

          {/* Наличие ежемесячного отчета */}
          <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#2D3139]">
            <div className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider mb-2">
              Наличие ежемесячного отчета
            </div>
            {task.isReportNotRequired ? (
              <div className="p-2.5 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 flex items-center gap-2">
                <Ban className="w-4 h-4 text-amber-400" />
                <span>Отчет по данной задаче не требуется</span>
              </div>
            ) : task.branchReports && task.branchReports.length > 0 ? (
              <div className="space-y-1.5">
                {task.branchReports.map((br, brIdx) => (
                  <div
                    key={brIdx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-[#171A21] border border-[#2D3139]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-900/40 text-blue-300 border border-blue-500/30">
                        {br.departmentShortName}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          br.isReceived ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {br.isReceived ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Отчет получен
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            Отчет отсутствует
                          </>
                        )}
                      </span>
                    </div>

                    <div className="text-gray-300 font-mono text-[11px]">
                      {br.documentDetails ? (
                        <span>Реквизиты: <strong className="text-white">{br.documentDetails}</strong></span>
                      ) : (
                        <span className="text-gray-500">Реквизиты не указаны</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-amber-400/80 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Ожидается поступление отчетов от подразделений
              </div>
            )}
          </div>

          {/* Примечания */}
          {task.notes && (
            <div className="p-3.5 rounded-xl bg-[#0F1115] border border-[#2D3139]">
              <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">
                Примечания
              </div>
              <div className="text-gray-300 leading-relaxed">
                {task.notes}
              </div>
            </div>
          )}
        </div>

        {/* Подвал */}
        <div className="px-5 py-3 bg-[#1A1D24] border-t border-[#2D3139] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#2B2F3B] hover:bg-[#363B4A] text-white text-xs font-medium cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
