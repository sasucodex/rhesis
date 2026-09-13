import { useState, useEffect } from 'react'
import { FileAudio, Menu, Loader2, AlertCircle, Moon, Sun } from 'lucide-react'
import {
  getStatus,
  setupApiKey,
  deleteApiKey,
  fetchHistory,
  transcribeAudio,
  updateTranscript,
  deleteTranscript,
  exportDocument,
} from './services/api'
import { getAbsoluteLong, getRelativeMain } from './utils/dateUtils'
import ConfirmDeleteModal from './components/modals/ConfirmDeleteModal'
import RichTextEditor from './components/editor/RichTextEditor'
import EditorHeader from './components/editor/EditorHeader'
import Sidebar from './components/layout/Sidebar'
import UploadZone from './components/upload/UploadZone'

export default function App() {
  const [view, setView] = useState('loading')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [originalTheme, setOriginalTheme] = useState(true)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const [historyList, setHistoryList] = useState([])

  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [currentRecordId, setCurrentRecordId] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [enableChapters, setEnableChapters] = useState(() => localStorage.getItem('rhesis_chapters') !== 'false')
  const [enableTimestamps, setEnableTimestamps] = useState(() => localStorage.getItem('rhesis_timestamps') !== 'false')
  const [tempEnableChapters, setTempEnableChapters] = useState(() => localStorage.getItem('rhesis_chapters') !== 'false')
  const [tempEnableTimestamps, setTempEnableTimestamps] = useState(() => localStorage.getItem('rhesis_timestamps') !== 'false')

  const loadHistory = async () => {
    try {
      const data = await fetchHistory()
      setHistoryList(data)
    } catch (err) {
      console.error("Errore history:", err)
    }
  }



  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    let ignore = false
    const init = async () => {
      try {
        const data = await getStatus()
        if (ignore) return
        if (data.api_key_configured) {
          setView('main')
          const history = await fetchHistory()
          if (!ignore) setHistoryList(history)
        } else {
          setView('setup')
        }
      } catch (err) {
        if (ignore) return
        console.error("Server irreperibile:", err)
        setView('main')
      }
    }
    init()
    return () => {
      ignore = true
    }
  }, [])

  const startNewTranscription = () => {
    setStatus('idle')
    setFile(null)
    setTranscript('')
    setErrorMsg('')
    setIsEditing(false)
    setCurrentRecordId(null)
  }

  const handleDelete = async (id) => {
    try {
      await deleteTranscript(id)
      setItemToDelete(null)
      if (currentRecordId === id) {
        startNewTranscription()
      }
      loadHistory()
    } catch (err) {
      console.error("Errore cancellazione:", err)
    }
  }

  const handleSetupSubmit = async () => {
    try {
      await setupApiKey(apiKeyInput)
      setView('main')
      setIsSettingsOpen(false)
      setApiKeyInput('')
      setOriginalTheme(isDarkMode)
      setEnableChapters(tempEnableChapters)
      setEnableTimestamps(tempEnableTimestamps)
      localStorage.setItem('rhesis_chapters', tempEnableChapters)
      localStorage.setItem('rhesis_timestamps', tempEnableTimestamps)
      loadHistory()
    } catch {
      alert("Errore nel salvataggio della chiave.")
    }
  }

  const openSettings = () => {
    setOriginalTheme(isDarkMode)
    setApiKeyInput('')
    setTempEnableChapters(enableChapters)
    setTempEnableTimestamps(enableTimestamps)
    setIsSettingsOpen(true)
  }

  const handleSettingsCloseAttempt = () => {
    const hasChanges =
      apiKeyInput.trim() !== '' ||
      isDarkMode !== originalTheme ||
      tempEnableChapters !== enableChapters ||
      tempEnableTimestamps !== enableTimestamps

    if (hasChanges) {
      setShowUnsavedWarning(true)
    } else {
      setIsSettingsOpen(false)
    }
  }

  const discardChanges = () => {
    setIsDarkMode(originalTheme)
    setApiKeyInput('')
    setTempEnableChapters(enableChapters)
    setTempEnableTimestamps(enableTimestamps)
    setShowUnsavedWarning(false)
    setIsSettingsOpen(false)
  }

  const saveSettings = async () => {
    if (apiKeyInput.trim() !== '') {
      await handleSetupSubmit()
    } else {
      setOriginalTheme(isDarkMode)
      setEnableChapters(tempEnableChapters)
      setEnableTimestamps(tempEnableTimestamps)
      localStorage.setItem('rhesis_chapters', tempEnableChapters)
      localStorage.setItem('rhesis_timestamps', tempEnableTimestamps)
      setIsSettingsOpen(false)
    }
  }

  const handleLogout = async () => {
    try {
      await deleteApiKey()
      setView('setup')
      setIsSettingsOpen(false)
      setApiKeyInput('')
    } catch {
      alert("Errore durante la disconnessione.")
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const validateAndSetFile = (selectedFile) => {
    const allowed = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.mp4', '.webm', '.mpeg', '.mpga', '.amr']
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
    if (!allowed.includes(ext) && !selectedFile.type.startsWith('audio/')) {
      setErrorMsg(`Formato non supportato: "${ext}". Inserisci un file audio valido.`)
      setStatus('error')
      setFile(null)
      return
    }
    setErrorMsg('')
    setFile(selectedFile)
    setStatus('idle')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const handleTranscribe = async () => {
    if (!file) return
    setStatus('uploading')
    setErrorMsg('')
    setTranscript('')
    setIsEditing(false)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('enable_chapters', enableChapters)
    formData.append('enable_timestamps', enableTimestamps)

    try {
      const data = await transcribeAudio(formData)
      setCurrentRecordId(data.id)
      setTranscript(data.transcript)
      setStatus('success')
      loadHistory()
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const handleSaveEdit = async (newHtml) => {
    try {
      await updateTranscript(currentRecordId, newHtml)
      setTranscript(newHtml)
      setIsEditing(false)
      loadHistory()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleRename = async (newFilename) => {
    if (!currentRecordId || !newFilename) return
    try {
      await updateTranscript(currentRecordId, { filename: newFilename })
      setHistoryList((prev) =>
        prev.map((item) =>
          item.id === currentRecordId ? { ...item, filename: newFilename } : item
        )
      )
    } catch (err) {
      alert(err.message)
    }
  }

  const viewHistoryItem = (item) => {
    setIsEditing(false)
    if (item.status === 'success' && item.transcript) {
      setCurrentRecordId(item.id)
      setTranscript(item.transcript)
      setStatus('success')
    }
  }

  const copyToClipboard = () => {
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = transcript
    navigator.clipboard.writeText(tempDiv.innerText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleExport = async (format) => {
    try {
      const currentItem = historyList.find((item) => item.id === currentRecordId)
      const originalName = currentItem ? currentItem.filename.replace(/^\d+_/, '') : 'Trascrizione'
      const rawName = originalName.replace(/\.[^/.]+$/, "")
      const absDate = currentItem ? getAbsoluteLong(currentItem.created_at) : ''
      const titleForDoc = absDate ? `${rawName} - ${absDate}` : rawName
      const fileName = `${titleForDoc}.${format === 'word' ? 'docx' : 'pdf'}`

      const blob = await exportDocument(format, {
        text: transcript,
        filename: rawName,
        date_str: absDate,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      alert(err.message)
    }
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-900 dark:text-zinc-100 animate-spin" />
      </div>
    )
  }

  if (view === 'setup') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Benvenuto in Rhesis</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Per iniziare, abbiamo bisogno della tua API Key di Google AI Studio.</p>
          </div>
          <div className="space-y-4">
            <ol className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2 list-decimal list-inside bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-xl">
              <li>Vai su <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-zinc-900 dark:text-zinc-100 underline font-medium hover:opacity-80">Google AI Studio</a></li>
              <li>Accedi con il tuo account</li>
              <li>Clicca su "Create API Key" e copia il codice</li>
            </ol>
            <input
              type="password"
              placeholder="Incolla qui la tua API Key..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <button
              type="button"
              onClick={handleSetupSubmit}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-medium rounded-xl transition-colors shadow-md"
            >
              Salva e Inizia
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden relative">
      <Sidebar
        historyList={historyList}
        currentRecordId={currentRecordId}
        onSelectRecord={viewHistoryItem}
        onNewTranscription={startNewTranscription}
        onDeleteClick={(item) => setItemToDelete(item)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={openSettings}
      />

      <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar bg-zinc-50 dark:bg-[#09090b] relative">
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 animate-in fade-in duration-300">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-600 dark:text-zinc-400 shadow-sm bg-white/50 dark:bg-black/20 backdrop-blur-md"
              title="Apri barra laterale"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              <h1 className="font-bold text-zinc-900 dark:text-zinc-100">Rhesis</h1>
            </div>
          </div>
        )}

        {isSettingsOpen && (
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !showUnsavedWarning) handleSettingsCloseAttempt()
            }}
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl relative">
              {showUnsavedWarning && (
                <div className="absolute inset-0 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-md z-20 rounded-3xl p-8 flex flex-col justify-center items-center text-center animate-in zoom-in-95 duration-200">
                  <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                  <h4 className="text-xl font-bold mb-2">Modifiche non salvate</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Le tue modifiche alle impostazioni andranno perse. Vuoi procedere?</p>
                  <div className="space-y-3 w-full">
                    <button
                      type="button"
                      onClick={discardChanges}
                      className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                    >
                      Esci senza salvare
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUnsavedWarning(false)}
                      className="w-full py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                    >
                      Torna alle impostazioni
                    </button>
                  </div>
                </div>
              )}

              <h3 className="text-xl font-semibold mb-6">Impostazioni</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-zinc-300" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    <span className="font-medium text-sm">Tema Scuro</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isDarkMode ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${isDarkMode ? 'translate-x-6 bg-white dark:bg-zinc-900' : 'bg-white'}`}></div>
                  </button>
                </div>

                <div>
                  <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-2">Modifica API Key</label>
                  <input
                    type="password"
                    placeholder="Nuova API Key..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4 space-y-4">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-2">Opzioni Trascrizione</h4>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">Genera capitoli per argomento</span>
                    <button
                      type="button"
                      onClick={() => setTempEnableChapters(!tempEnableChapters)}
                      className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${tempEnableChapters ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${tempEnableChapters ? 'translate-x-6 bg-white dark:bg-zinc-900' : 'bg-white'}`}></div>
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">Includi timestamp (minutaggi)</span>
                    <button
                      type="button"
                      onClick={() => setTempEnableTimestamps(!tempEnableTimestamps)}
                      className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${tempEnableTimestamps ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${tempEnableTimestamps ? 'translate-x-6 bg-white dark:bg-zinc-900' : 'bg-white'}`}></div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4">
                  <button
                    type="button"
                    onClick={handleSettingsCloseAttempt}
                    className="flex-1 py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-lg font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Chiudi
                  </button>
                  <button
                    type="button"
                    onClick={saveSettings}
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white rounded-lg font-medium text-white dark:text-zinc-900 shadow-md"
                  >
                    Salva
                  </button>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg font-medium transition-colors text-sm"
                  >
                    Scollega API Key (Logout)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl space-y-8 mt-12 px-8 pb-16 mx-auto flex flex-col items-center">
          {status === 'success' && transcript ? (
            <div className={`w-full bg-white dark:bg-[#131314] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col ${isEditing ? 'h-[600px]' : ''}`}>
              {!isEditing ? (
                <>
                  <EditorHeader
                    filename={
                      historyList.find((item) => item.id === currentRecordId)?.filename ||
                      (file ? file.name : 'Trascrizione')
                    }
                    dateStr={
                      historyList.find((item) => item.id === currentRecordId)?.created_at
                        ? getRelativeMain(historyList.find((item) => item.id === currentRecordId).created_at)
                        : ''
                    }
                    isEditing={isEditing}
                    isCopied={isCopied}
                    onRename={handleRename}
                    onCopy={copyToClipboard}
                    onExport={handleExport}
                    onEditToggle={() => setIsEditing(true)}
                  />
                  <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar flex-1">
                    <div className="prose dark:prose-invert prose-zinc max-w-none prose-lg" dangerouslySetInnerHTML={{ __html: transcript }}></div>
                  </div>
                </>
              ) : (
                <RichTextEditor
                  content={transcript}
                  onSave={handleSaveEdit}
                  onCancel={() => setIsEditing(false)}
                />
              )}
            </div>
          ) : (
            <UploadZone
              file={file}
              status={status}
              errorMsg={errorMsg}
              isDragging={isDragging}
              onFileSelect={handleFileSelect}
              onTranscribe={handleTranscribe}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          )}
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        itemToDelete={itemToDelete}
        onConfirm={handleDelete}
        onClose={() => setItemToDelete(null)}
      />
    </div>
  )
}
