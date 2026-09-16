import { useState, useEffect, useMemo, useRef } from 'react'
import { FileAudio, Menu, Loader2, AlertCircle } from 'lucide-react'
import {
  getStatus,
  setupApiKey,
  deleteApiKey,
  fetchHistory,
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  transcribeAudio,
  getTaskStatus,
  updateTranscript,
  deleteTranscript,
  exportDocument,
  getAudioUrl,
} from './services/api'
import { getAbsoluteLong, getRelativeMain } from './utils/dateUtils'
import ConfirmDeleteModal from './components/modals/ConfirmDeleteModal'
import OnboardingModal from './components/modals/OnboardingModal'
import SettingsModal from './components/modals/SettingsModal'
import LegalModal from './components/modals/LegalModal'
import ReportIssueModal from './components/modals/ReportIssueModal'
import CourseModal from './components/courses/CourseModal'
import RichTextEditor from './components/editor/RichTextEditor'
import EditorHeader from './components/editor/EditorHeader'
import AudioPlayerSync from './components/editor/AudioPlayerSync'
import { parseTimestampToSeconds } from './utils/audioUtils'
import Sidebar from './components/layout/Sidebar'
import UploadZone from './components/upload/UploadZone'

export default function App() {
  const [view, setView] = useState('loading')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(1)
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false)
  const [legalActiveTab, setLegalActiveTab] = useState('termini')
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false)
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [courseToEdit, setCourseToEdit] = useState(null)
  const [lastError, setLastError] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [uploadCourseId, setUploadCourseId] = useState(null)

  const [historyList, setHistoryList] = useState([])
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const transcriptContainerRef = useRef(null)

  const [apiKeyValid, setApiKeyValid] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState('unconfigured')
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [settingsError, setSettingsError] = useState('')

  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState('idle')
  const [transcript, setTranscript] = useState('')
  const [currentRecordId, setCurrentRecordId] = useState(null)
  const [currentTaskId, setCurrentTaskId] = useState(null)
  const [currentTask, setCurrentTask] = useState(null)
  const [seekRequest, setSeekRequest] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [enableChapters, setEnableChapters] = useState(() => localStorage.getItem('rhesis_chapters') !== 'false')
  const [enableTimestamps, setEnableTimestamps] = useState(() => localStorage.getItem('rhesis_timestamps') !== 'false')
  const [preserveAudio, setPreserveAudio] = useState(() => localStorage.getItem('rhesis_preserve_audio') !== 'false')

  const loadCourses = async () => {
    try {
      const data = await fetchCourses()
      setCourses(data)
    } catch (err) {
      console.error('Errore recupero corsi:', err)
    }
  }

  const loadHistory = async () => {
    try {
      const data = await fetchHistory()
      setHistoryList(data)
    } catch (err) {
      console.error('Errore history:', err)
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

    const fetchStatusWithRetry = async (retries = 2, delay = 800) => {
      let lastError
      for (let i = 0; i <= retries; i++) {
        try {
          return await getStatus()
        } catch (err) {
          lastError = err
          if (i < retries) {
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        }
      }
      throw lastError
    }

    const init = async () => {
      try {
        const data = await fetchStatusWithRetry()
        if (ignore) return

        if (data.api_key_configured) {
          if (data.api_key_status === 'invalid') {
            setApiKeyValid(false)
            setApiKeyStatus('invalid')
            setView('setup')
            const msg = 'La chiave API salvata non è più valida o è stata revocata. Inserisci una nuova chiave.'
            setSetupError(msg)
            setLastError(msg)
            return
          }

          if (data.api_key_status === 'valid' || data.api_key_valid === true) {
            setApiKeyValid(true)
            setApiKeyStatus('valid')
          } else {
            setApiKeyValid(false)
            setApiKeyStatus('unreachable')
          }

          setView('main')
          const [history, coursesData] = await Promise.all([
            fetchHistory().catch(() => []),
            fetchCourses().catch(() => []),
          ])
          if (!ignore) {
            setHistoryList(history)
            setCourses(coursesData)
          }
        } else {
          setApiKeyValid(false)
          setApiKeyStatus('unconfigured')
          setView('setup')
        }
      } catch (err) {
        if (ignore) return
        console.error('Server irreperibile:', err)
        setApiKeyValid(false)
        setApiKeyStatus('unreachable')
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

  useEffect(() => {
    const handleRevalidate = async () => {
      try {
        const data = await getStatus()
        if (data.api_key_configured) {
          if (data.api_key_status === 'valid' || data.api_key_valid === true) {
            setApiKeyValid(true)
            setApiKeyStatus('valid')
            setSetupError('')
            setView((prevView) => {
              if (prevView === 'setup') {
                loadHistory()
                loadCourses()
                return 'main'
              }
              return prevView
            })
          } else if (data.api_key_status === 'invalid') {
            setApiKeyValid(false)
            setApiKeyStatus('invalid')
          } else if (data.api_key_status === 'unreachable') {
            setApiKeyValid(false)
            setApiKeyStatus('unreachable')
          }
        }
      } catch {
        // Nessuna azione se il server o la rete sono momentaneamente irraggiungibili
      }
    }

    const onOnline = () => {
      handleRevalidate()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRevalidate()
      }
    }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const startNewTranscription = () => {
    setStatus('idle')
    setFile(null)
    setTranscript('')
    setErrorMsg('')
    setIsEditing(false)
    setCurrentRecordId(null)
    setSeekRequest(null)
    setCurrentTaskId(null)
    setCurrentTask(null)
    setUploadCourseId(selectedCourseId)
  }

  const handleDelete = async (id) => {
    try {
      await deleteTranscript(id)
      setItemToDelete(null)
      if (currentRecordId === id) {
        startNewTranscription()
      }
      loadHistory()
      loadCourses()
    } catch (err) {
      setLastError(err.message || 'Errore durante la cancellazione.')
      console.error('Errore cancellazione:', err)
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
      setApiKeyStatus('valid')
      setView('main')
      setIsSettingsOpen(false)
      setIsOnboardingOpen(false)
      loadHistory()
      loadCourses()
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

  const handleSaveSettings = async ({
    newApiKey,
    enableChapters: newChapters,
    enableTimestamps: newTimestamps,
    preserveAudio: newPreserveAudio,
  }) => {
    if (newApiKey) {
      setIsValidatingKey(true)
      setSettingsError('')
      try {
        await setupApiKey(newApiKey)
        setApiKeyValid(true)
        setApiKeyStatus('valid')
        setEnableChapters(newChapters)
        setEnableTimestamps(newTimestamps)
        setPreserveAudio(newPreserveAudio)
        localStorage.setItem('rhesis_chapters', newChapters)
        localStorage.setItem('rhesis_timestamps', newTimestamps)
        localStorage.setItem('rhesis_preserve_audio', newPreserveAudio)
        setIsSettingsOpen(false)
        loadHistory()
        loadCourses()
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
      setPreserveAudio(newPreserveAudio)
      localStorage.setItem('rhesis_chapters', newChapters)
      localStorage.setItem('rhesis_timestamps', newTimestamps)
      localStorage.setItem('rhesis_preserve_audio', newPreserveAudio)
      setIsSettingsOpen(false)
    }
  }

  const handleLogout = async () => {
    try {
      await deleteApiKey()
      setApiKeyValid(false)
      setApiKeyStatus('unconfigured')
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

  const handleOpenOnboardingFromSettings = (step = 1) => {
    setOnboardingInitialStep(typeof step === 'number' ? step : 1)
    setIsSettingsOpen(false)
    setIsOnboardingOpen(true)
  }

  const handleOpenCreateCourse = () => {
    setCourseToEdit(null)
    setIsCourseModalOpen(true)
  }

  const handleOpenEditCourse = (course) => {
    setCourseToEdit(course)
    setIsCourseModalOpen(true)
  }

  const handleCreateOrUpdateCourse = async (courseData) => {
    if (courseToEdit) {
      await updateCourse(courseToEdit.id, courseData)
    } else {
      const created = await createCourse(courseData)
      if (status === 'idle' || status === 'error') {
        setUploadCourseId(created.id)
      }
    }
    await Promise.all([loadCourses(), loadHistory()])
  }

  const handleDeleteCourse = async (courseId) => {
    await deleteCourse(courseId)
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null)
    }
    if (uploadCourseId === courseId) {
      setUploadCourseId(null)
    }
    await Promise.all([loadCourses(), loadHistory()])
  }

  const handleChangeLessonCourse = async (recordId, newCourseId) => {
    const targetId = recordId || currentRecordId
    if (!targetId) return
    try {
      await updateTranscript(targetId, { course_id: newCourseId ? Number(newCourseId) : 0 })
      await Promise.all([loadHistory(), loadCourses()])
    } catch (err) {
      setLastError(err.message)
      alert(err.message)
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
    if (selectedCourseId && !uploadCourseId) {
      setUploadCourseId(selectedCourseId)
    }
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

  useEffect(() => {
    if (!currentTaskId) return
    let isMounted = true
    let completeTimer = null

    const pollInterval = setInterval(async () => {
      try {
        const taskData = await getTaskStatus(currentTaskId)
        if (!isMounted) return
        setCurrentTask(taskData)

        if (taskData.status === 'completed') {
          clearInterval(pollInterval)
          completeTimer = setTimeout(() => {
            if (!isMounted) return
            if (taskData.result) {
              setCurrentRecordId(taskData.result.id)
              setTranscript(taskData.result.transcript)
            }
            setStatus('success')
            setCurrentTaskId(null)
            setCurrentTask(null)
            loadHistory()
            loadCourses()
          }, 1200)
        } else if (taskData.status === 'error') {
          clearInterval(pollInterval)
          const rawMsg = taskData.error || taskData.message || 'Errore durante la trascrizione'
          const isAuthErr =
            rawMsg.includes('401') ||
            rawMsg.toLowerCase().includes('unauthenticated') ||
            rawMsg.toLowerCase().includes('chiave') ||
            rawMsg.toLowerCase().includes('api key')
          const cleanMsg = isAuthErr
            ? 'Chiave API non valida o scaduta. Per avviare la trascrizione è necessario configurare una chiave API funzionante.'
            : rawMsg
          setErrorMsg(cleanMsg)
          setLastError(cleanMsg)
          setStatus('error')
          setCurrentTaskId(null)
          setCurrentTask(null)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Errore polling task:', err)
      }
    }, 1500)

    return () => {
      isMounted = false
      clearInterval(pollInterval)
      if (completeTimer) {
        clearTimeout(completeTimer)
      }
    }
  }, [currentTaskId])

  const handleTranscribe = async () => {
    if (!file) return
    setStatus('processing')
    setErrorMsg('')
    setTranscript('')
    setIsEditing(false)
    setCurrentTask({
      status: 'upload_local',
      progress: 15,
      message: 'Salvataggio audio locale in corso...',
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('enable_chapters', enableChapters)
    formData.append('enable_timestamps', enableTimestamps)
    formData.append('preserve_audio', preserveAudio)
    if (uploadCourseId) {
      formData.append('course_id', uploadCourseId)
      const matchedCourse = courses.find((c) => c.id === uploadCourseId)
      if (matchedCourse) {
        if (matchedCourse.name) formData.append('course_name', matchedCourse.name)
        if (matchedCourse.professor_name) formData.append('professor_name', matchedCourse.professor_name)
      }
    }

    try {
      const data = await transcribeAudio(formData)
      setCurrentTaskId(data.task_id)
      setCurrentTask((prev) => ({
        ...prev,
        ...data,
      }))
    } catch (err) {
      const rawMsg = err.message || ''
      const isAuthErr =
        rawMsg.includes('401') ||
        rawMsg.toLowerCase().includes('unauthenticated') ||
        rawMsg.toLowerCase().includes('chiave') ||
        rawMsg.toLowerCase().includes('api key')
      const cleanMsg = isAuthErr
        ? 'Chiave API non valida o scaduta. Per avviare la trascrizione è necessario configurare una chiave API funzionante.'
        : rawMsg || 'Errore durante la trascrizione.'
      setErrorMsg(cleanMsg)
      setLastError(cleanMsg)
      setStatus('error')
      setCurrentTaskId(null)
      setCurrentTask(null)
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
    setSeekRequest(null)
    setCurrentTaskId(null)
    setCurrentTask(null)
    if (item.status === 'success' && item.transcript) {
      setCurrentRecordId(item.id)
      setTranscript(item.transcript)
      setStatus('success')
    }
  }

  const copyToClipboard = () => {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = transcript
    navigator.clipboard.writeText(tempDiv.innerText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleExport = async (format) => {
    try {
      const currentItem = historyList.find((item) => item.id === currentRecordId)
      const originalName = currentItem ? currentItem.filename.replace(/^\d+_/, '') : 'Trascrizione'
      const rawName = originalName.replace(/\.[^/.]+$/, '')
      const absDate = currentItem ? getAbsoluteLong(currentItem.created_at) : ''
      const titleForDoc = absDate ? `${rawName} - ${absDate}` : rawName
      const fileName = `${titleForDoc}.${format === 'word' ? 'docx' : 'pdf'}`

      const blob = await exportDocument(format, {
        text: transcript,
        filename: rawName,
        date_str: absDate,
        course_name: currentItem?.course_name || '',
        professor_name: currentItem?.professor_name || '',
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

  const formattedTranscript = useMemo(() => {
    if (!transcript) return ''
    let html = transcript
      .replace(/<h2>\s*<\/h2>\s*<p>(\s*\[\d{1,2}:\d{2}(?::\d{2})?\].*?)<\/p>/gi, '<h2>$1</h2>')
      .replace(/<p>\s*(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*##\s*(.*?)<\/p>/gi, '<h2>$2</h2>')
      .replace(/<p>\s*##\s*(\[\d{1,2}:\d{2}(?::\d{2})?\]\s*.*?)<\/p>/gi, '<h2>$1</h2>')
      .replace(/<p>\s*##\s*(.*?)<\/p>/gi, '<h2>$1</h2>')
      .replace(/<h2>\s*<\/h2>\s*/gi, '')

    html = html.replace(
      /(<h2>([\s\S]*?)<\/h2>)(\s*)(<p[^>]*>)([\s\S]*?)(?=<\/p>|$)/gi,
      (match, h2Full, h2Inner, sep, pOpen, pInner) => {
        const tsMatch = h2Inner.match(/\[\d{1,2}:\d{2}(?::\d{2})?\]/)
        if (!tsMatch) return match
        const ts = tsMatch[0]
        const cleanH2Inner = h2Inner.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/g, '').trim()
        const cleanH2 = `<h2>${cleanH2Inner}</h2>`
        if (/^\s*\[\d{1,2}:\d{2}(?::\d{2})?\]/.test(pInner)) {
          return `${cleanH2}${sep}${pOpen}${pInner}`
        }
        return `${cleanH2}${sep}${pOpen}${ts} ${pInner.trimStart()}`
      }
    )

    html = html.replace(/<h2>([\s\S]*?)<\/h2>/gi, (match, inner) => {
      const cleanInner = inner.replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]\s*/g, '').trim()
      return `<h2>${cleanInner}</h2>`
    })

    html = html
      .replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*##\s*/g, '[$1] ')
      .replace(
        /\[(\d{1,2}:\d{2}(?::\d{2})?)\]/g,
        '<button type="button" data-timestamp="$1" class="timestamp-badge inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 my-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 font-medium select-none align-middle transition-colors cursor-pointer" title="Salta al timestamp $1">▶ $1</button>'
      )

    if (activeSearchQuery && activeSearchQuery.trim()) {
      const escaped = activeSearchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(?![^<]*>)(${escaped})`, 'gi')
      html = html.replace(
        regex,
        '<mark class="search-highlight bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 text-zinc-900 rounded-xs px-0.5 font-medium">$1</mark>'
      )
    }

    return html
  }, [transcript, activeSearchQuery])

  useEffect(() => {
    if (activeSearchQuery && currentRecordId) {
      const timer = setTimeout(() => {
        const firstMatch = transcriptContainerRef.current?.querySelector('.search-highlight')
        if (firstMatch) {
          firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeSearchQuery, currentRecordId, formattedTranscript])

  const handleTimestampClick = (e) => {
    const badge = e.target.closest('[data-timestamp]')
    if (badge) {
      const timeStr = badge.getAttribute('data-timestamp')
      const seconds = parseTimestampToSeconds(timeStr)
      if (seconds !== null) {
        setSeekRequest({ time: seconds, id: Date.now() })
      }
    }
  }

  const handleEditorSeek = (seconds) => {
    setSeekRequest({ time: seconds, id: Date.now() })
  }

  const currentItem = historyList.find((item) => item.id === currentRecordId)
  const fileAudioUrl = useMemo(() => {
    if (file && file instanceof File) {
      return URL.createObjectURL(file)
    }
    return null
  }, [file])

  const currentAudioUrl = (currentItem?.audio_preserved && currentRecordId)
    ? getAudioUrl(currentRecordId)
    : fileAudioUrl

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
        courses={courses}
        selectedCourseId={selectedCourseId}
        onSelectCourse={setSelectedCourseId}
        onCreateCourse={handleOpenCreateCourse}
        onEditCourse={handleOpenEditCourse}
        onAssignCourse={handleChangeLessonCourse}
        currentRecordId={currentRecordId}
        onSelectRecord={viewHistoryItem}
        onNewTranscription={startNewTranscription}
        onDeleteClick={(item) => setItemToDelete(item)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={openSettings}
        onSearchQueryChange={setActiveSearchQuery}
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
          {!apiKeyValid && apiKeyStatus !== 'unreachable' && (
            <div className="w-full p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in duration-300">
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="text-sm font-semibold">Chiave API non configurata o scaduta</p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    Per poter trascrivere nuove lezioni universitarie è necessario inserire una chiave valida.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openSettings}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shadow-xs shrink-0 self-start sm:self-auto"
              >
                Configura Chiave API
              </button>
            </div>
          )}
          {status === 'success' && transcript ? (
            <div className={`w-full bg-white dark:bg-[#131314] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col ${isEditing ? 'h-[600px]' : ''}`}>
              {!isEditing ? (
                <>
                  <EditorHeader
                    filename={
                      currentItem?.filename ||
                      (file ? file.name : 'Trascrizione')
                    }
                    dateStr={
                      currentItem?.created_at
                        ? getRelativeMain(currentItem.created_at)
                        : ''
                    }
                    isEditing={isEditing}
                    isCopied={isCopied}
                    onRename={handleRename}
                    onCopy={copyToClipboard}
                    onExport={handleExport}
                    onEditToggle={() => setIsEditing(true)}
                  />
                  {currentAudioUrl && (
                    <AudioPlayerSync
                      audioUrl={currentAudioUrl}
                      seekRequest={seekRequest}
                    />
                  )}
                  <div
                    ref={transcriptContainerRef}
                    className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar flex-1"
                    onClick={handleTimestampClick}
                  >
                    <div
                      className="prose dark:prose-invert prose-zinc max-w-none prose-lg"
                      dangerouslySetInnerHTML={{ __html: formattedTranscript }}
                    />
                  </div>
                </>
              ) : (
                <>
                  {currentAudioUrl && (
                    <AudioPlayerSync
                      audioUrl={currentAudioUrl}
                      seekRequest={seekRequest}
                    />
                  )}
                  <RichTextEditor
                    content={transcript}
                    onSeek={handleEditorSeek}
                    onSave={handleSaveEdit}
                    onCancel={() => setIsEditing(false)}
                  />
                </>
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
              task={currentTask}
              courses={courses}
              selectedCourseId={uploadCourseId}
              onSelectCourse={setUploadCourseId}
              onCreateCourse={handleOpenCreateCourse}
              onOpenSettings={openSettings}
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
          apiKeyStatus={apiKeyStatus}
          isValidatingKey={isValidatingKey}
          settingsError={settingsError}
          setSettingsError={setSettingsError}
          enableChapters={enableChapters}
          enableTimestamps={enableTimestamps}
          preserveAudio={preserveAudio}
          onSave={handleSaveSettings}
          onOpenOnboarding={handleOpenOnboardingFromSettings}
          onLogout={handleLogout}
          onOpenLegal={handleOpenLegal}
          onOpenReportIssue={handleOpenReportIssue}
        />
      )}

      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => {
          setIsCourseModalOpen(false)
          setCourseToEdit(null)
        }}
        onSave={handleCreateOrUpdateCourse}
        courseToEdit={courseToEdit}
        onDelete={handleDeleteCourse}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        itemToDelete={itemToDelete}
        onConfirm={handleDelete}
        onClose={() => setItemToDelete(null)}
      />

      {isOnboardingOpen && (
        <OnboardingModal
          key={onboardingInitialStep}
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={handleSetupSubmit}
          canClose={true}
          initialStep={onboardingInitialStep}
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
