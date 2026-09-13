export default function ConfirmDeleteModal({ isOpen, itemToDelete, onConfirm, onClose }) {
  if (!isOpen || !itemToDelete) return null

  const displayName = itemToDelete.filename ? itemToDelete.filename.replace(/^\d+_/, '') : ''

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#18181b] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Eliminare la trascrizione?</h3>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
            Sei sicuro di voler eliminare la trascrizione di <span className="font-semibold text-zinc-800 dark:text-zinc-300">"{displayName}"</span>? Questa azione è irreversibile.
          </p>
          
          <div className="flex gap-3 justify-end mt-6">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button 
              type="button"
              onClick={() => onConfirm(itemToDelete.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
            >
              Elimina definitivamente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ConfirmDeleteModal }
