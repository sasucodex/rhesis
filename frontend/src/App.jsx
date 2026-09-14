import { useState, useEffect } from 'react'
import { FileAudio, Menu, Loader2 } from 'lucide-react'
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
import OnboardingModal from './components/modals/OnboardingModal'
import SettingsModal from './components/modals/SettingsModal'
import LegalModal from './components/modals/LegalModal'
import ReportIssueModal from './components/modals/ReportIssueModal'
import RichTextEditor from './components/editor/RichTextEditor'
import EditorHeader from './components/editor/EditorHeader'
import Sidebar from './components/layout/Sidebar'
import UploadZone from './components/upload/UploadZone'

export default function App() {
  const [view, setView] = useState('loading')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false)
  const [legalActiveTab, setLegalActiveTab] = useState('termini')
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false)
  const [lastError, setLastError] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const [historyList, setHistoryList] = useState([])

  const [apiKeyValid, setApiKeyValid] = useState(false)
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [settingsError, setSettingsError] = useState('')

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
        if (data.api_key_configured && data.api_key_valid) {
          setApiKeyValid(true)
          setView('main')
          const history = await fetchHistory()
          if (!ignore) setHistoryList(history)
        } else {
          setApiKeyValid(false)
          setView('setup')
          if (data.api_key_configured && !data.api_key_valid) {
            const msg = 'La chiave API salvata non è più valida o è stata revocata. Inserisci una nuova chiave.'
            setSetupError(msg)
            setLastError(msg)
          }
        }
      } catch (err) {
        if (ignore) return
        console.error("Server irreperibile:", err)
        setApiKeyValid(false)
        setView('setup')
        const msg = 'Impossibile connettersi al server Rhesis. Assicurati che il backend sia avviato.'
        setSetupError(msg)
        setLastError(msg)
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
      setLastError(err.message || 'Errore durante la cancellazione.')
      console.error("Errore cancellazione:", err)
    }
  }

  const handleSetupSubmit = async (keyParam) => {
    const keyToValidate = typeof keyParam === 'string' ? keyParam.trim() : ''
    if (!keyToValidate) {
      const msg = 'Inserisci la tua API Key prima di proseguire.'
      setSetupError(msg)
      setLastError(msg)
      return
    }
    setIsValidatingKey(true)
    setSetupError('')
    try {
      await setupApiKey(keyToValidate)
      setApiKeyValid(true)
      setView('main')
      setIsSettingsOpen(false)
      setIsOnboardingOpen(false)
      loadHistory()
    } catch (err) {
      const msg = err.message || 'Chiave API Google non valida o revocata'
      setSetupError(msg)
      setLastError(msg)
      throw err
    } finally {
      setIsValidatingKey(false)
    }
  }

  const openSettings = () => {
    setSettingsError('')
    setIsSettingsOpen(true)
  }

  const handleSaveSettings = async ({ newApiKey, enableChapters: newChapters, enableTimestamps: newTimestamps }) => {
    if (newApiKey) {
      setIsValidatingKey(true)
      setSettingsError('')
      try {
        await setupApiKey(newApiKey)
        setApiKeyValid(true)
        setEnableChapters(newChapters)
        setEnableTimestamps(newTimestamps)
        localStorage.setItem('rhesis_chapters', newChapters)
        localStorage.setItem('rhesis_timestamps', newTimestamps)
        setIsSettingsOpen(false)
        loadHistory()
      } catch (err) {
        const msg = err.message || 'Chiave API Google non valida o revocata'
        setSettingsError(msg)
        setLastError(msg)
      } finally {
        setIsValidatingKey(false)
      }
    } else {
      setEnableChapters(newChapters)
      setEnableTimestamps(newTimestamps)
      localStorage.setItem('rhesis_chapters', newChapters)
      localStorage.setItem('rhesis_timestamps', newTimestamps)
      setIsSettingsOpen(false)
    }
  }

  const handleLogout = async () => {
    try {
      await deleteApiKey()
      setApiKeyValid(false)
      setView('setup')
      setIsSettingsOpen(false)
      setSetupError('')
    } catch (err) {
      const msg = 'Errore durante la disconnessione.'
      setLastError(err.message || msg)
      alert(msg)
    }
  }

  const handleOpenLegal = (tab) => {
    setLegalActiveTab(tab || 'termini')
    setIsLegalModalOpen(true)
  }

  const handleOpenReportIssue = () => {
    setIsReportIssueOpen(true)
  }

  const handleOpenOnboardingFromSettings = () => {
    setIsSettingsOpen(false)
    setIsOnboardingOpen(true)
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
      const msg = `Formato non supportato: "${ext}". Inserisci un file audio valido.`
      setErrorMsg(msg)
      setLastError(msg)
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
      setLastError(err.message)
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
      setLastError(err.message)
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
      setLastError(err.message)
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
      setLastError(err.message)
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
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center p-4 transition-colors">
        <OnboardingModal
          isOpen={true}
          onComplete={handleSetupSubmit}
          canClose={false}
          initialErrorMsg={setupError}
        />
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

      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          apiKeyValid={apiKeyValid}
          isValidatingKey={isValidatingKey}
          settingsError={settingsError}
          setSettingsError={setSettingsError}
          enableChapters={enableChapters}
          enableTimestamps={enableTimestamps}
          onSave={handleSaveSettings}
          onOpenOnboarding={handleOpenOnboardingFromSettings}
          onLogout={handleLogout}
          onOpenLegal={handleOpenLegal}
          onOpenReportIssue={handleOpenReportIssue}
        />
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        itemToDelete={itemToDelete}
        onConfirm={handleDelete}
        onClose={() => setItemToDelete(null)}
      />

      {isOnboardingOpen && (
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={handleSetupSubmit}
          canClose={true}
        />
      )}

      {isLegalModalOpen && (
        <LegalModal
          isOpen={isLegalModalOpen}
          activeTab={legalActiveTab}
          onClose={() => setIsLegalModalOpen(false)}
        />
      )}

      <ReportIssueModal
        isOpen={isReportIssueOpen}
        onClose={() => setIsReportIssueOpen(false)}
        lastError={lastError}
      />
    </div>
  )
}
