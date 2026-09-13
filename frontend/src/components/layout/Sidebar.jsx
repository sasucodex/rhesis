import { FileAudio, Menu, Plus, MessageSquare, Trash2, Settings } from 'lucide-react'
import { getRelativeSidebar } from '../../utils/dateUtils'

export default function Sidebar({
  historyList = [],
  currentRecordId,
  onSelectRecord,
  onNewTranscription,
  onDeleteClick,
  isOpen,
  onClose,
  onOpenSettings,
}) {
  return (
    <aside
      className={`${
        isOpen ? 'w-72 border-r' : 'w-0'
      } flex-shrink-0 bg-white dark:bg-[#131314] border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}
    >
      <div className="p-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-600 dark:text-zinc-400 shrink-0"
          title="Chiudi barra laterale"
        >
          <Menu className="w-5 h-5" />
        </button>
        <FileAudio className="w-6 h-6 text-zinc-900 dark:text-zinc-100 shrink-0" />
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight whitespace-nowrap">
          Rhesis
        </h1>
      </div>

      <div className="px-4 mt-2 mb-6">
        <button
          type="button"
          onClick={onNewTranscription}
          className="w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-full flex items-center gap-3 transition-colors text-sm font-medium whitespace-nowrap"
        >
          <Plus className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          Nuova trascrizione
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 custom-scrollbar min-w-[288px]">
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3 px-3 uppercase tracking-wider">
          Recenti
        </p>

        <div className="space-y-1">
          {historyList.length === 0 && (
            <p className="text-sm text-zinc-400 px-3 mt-2">Nessuna trascrizione.</p>
          )}
          {historyList.map((item) => {
            const isSelected = currentRecordId === item.id
            const itemStyle = isSelected
              ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'

            return (
              <div
                key={item.id}
                onClick={() => onSelectRecord(item)}
                className={`group w-full text-left py-2 px-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors min-h-[48px] ${itemStyle}`}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <MessageSquare
                    className={`w-4 h-4 shrink-0 ${isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}
                  />
                  <span className={`text-sm truncate ${isSelected ? 'font-medium' : ''}`} title={item.filename}>
                    {item.filename.replace(/^\d+_/, '')}
                  </span>
                </div>
                <div className="flex items-center shrink-0 ml-2">
                  <span className="text-xs text-zinc-400 font-medium whitespace-nowrap group-hover:hidden">
                    {getRelativeSidebar(item.created_at)}
                  </span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteClick(item)
                      }}
                      title="Elimina"
                      className="p-1 bg-white dark:bg-zinc-700 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/50 dark:hover:border-red-800 rounded transition-all shadow-sm border border-zinc-200 dark:border-zinc-600 group/btn"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-500 group-hover/btn:text-red-500 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-4 mt-auto min-w-[288px]">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full py-2.5 px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          <Settings className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          Impostazioni
        </button>
      </div>
    </aside>
  )
}
