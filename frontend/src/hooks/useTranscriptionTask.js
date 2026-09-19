import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  transcribeAudio,
  getTaskStatus,
  updateTranscript,
  exportDocument,
  getAudioUrl,
} from '../services/api'
import { getAbsoluteLong } from '../utils/dateUtils'

const ALLOWED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.m4a',
  '.wav',
  '.ogg',
  '.flac',
  '.aac',
  '.mp4',
  '.webm',
  '.mpeg',
  '.mpga',
  '.amr',
]

export function useTranscriptionTask({
  apiKeyValid,
  apiKeyStatus,
  courses,
  uploadCourseId,
  setUploadCourseId,
  selectedCourseId,
  historyList,
  onTranscriptionSuccess,
  onRenameSuccess,
  onOfflineError,
  onError,
}) {
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
  const [errorMsg, setErrorMsg] = useState('')

  const [enableChapters, setEnableChapters] = useState(
    () => localStorage.getItem('rhesis_chapters') !== 'false'
  )
  const [enableTimestamps, setEnableTimestamps] = useState(
    () => localStorage.getItem('rhesis_timestamps') !== 'false'
  )
  const [preserveAudio, setPreserveAudio] = useState(
    () => localStorage.getItem('rhesis_preserve_audio') !== 'false'
  )

  const validateAndSetFile = useCallback(
    (selectedFile) => {
      const ext = selectedFile.name
        .substring(selectedFile.name.lastIndexOf('.'))
        .toLowerCase()
      if (
        !ALLOWED_AUDIO_EXTENSIONS.includes(ext) &&
        !selectedFile.type.startsWith('audio/')
      ) {
        const msg = `Formato non supportato: "${ext}". Inserisci un file audio valido.`
        setErrorMsg(msg)
        onError?.(msg)
        setStatus('error')
        setFile(null)
        return
      }
      setErrorMsg('')
      setFile(selectedFile)
      setStatus('idle')
      if (selectedCourseId && !uploadCourseId) {
        setUploadCourseId?.(selectedCourseId)
      }
    },
    [selectedCourseId, uploadCourseId, setUploadCourseId, onError]
  )

  const handleFileSelect = useCallback(
    (e) => {
      if (e.target.files && e.target.files.length > 0) {
        validateAndSetFile(e.target.files[0])
      }
    },
    [validateAndSetFile]
  )

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndSetFile(e.dataTransfer.files[0])
      }
    },
    [validateAndSetFile]
  )

  const startNewTranscription = useCallback(() => {
    setStatus('idle')
    setFile(null)
    setTranscript('')
    setErrorMsg('')
    setIsEditing(false)
    setCurrentRecordId(null)
    setSeekRequest(null)
    setCurrentTaskId(null)
    setCurrentTask(null)
    setUploadCourseId?.(selectedCourseId)
  }, [selectedCourseId, setUploadCourseId])

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
            onTranscriptionSuccess?.()
          }, 1200)
        } else if (taskData.status === 'error') {
          clearInterval(pollInterval)
          const rawMsg =
            taskData.error || taskData.message || 'Errore durante la trascrizione'
          const isOfflineErr =
            (typeof navigator !== 'undefined' && !navigator.onLine) ||
            rawMsg.toLowerCase().includes('connessione') ||
            rawMsg.toLowerCase().includes('internet') ||
            rawMsg.toLowerCase().includes('name resolution') ||
            rawMsg.toLowerCase().includes('temporary failure') ||
            rawMsg.toLowerCase().includes('network') ||
            rawMsg.toLowerCase().includes('errno -3') ||
            rawMsg.toLowerCase().includes('errno -2') ||
            rawMsg.toLowerCase().includes('errno 101') ||
            rawMsg.toLowerCase().includes('gaierror') ||
            rawMsg.toLowerCase().includes('getaddrinfo') ||
            rawMsg.toLowerCase().includes('unreachable') ||
            rawMsg.toLowerCase().includes('offline')

          const isAuthErr =
            !isOfflineErr &&
            (rawMsg.includes('401') ||
              rawMsg.toLowerCase().includes('unauthenticated') ||
              rawMsg.toLowerCase().includes('chiave') ||
              rawMsg.toLowerCase().includes('api key') ||
              rawMsg.toLowerCase().includes('codice') ||
              rawMsg.toLowerCase().includes('accesso'))

          let cleanMsg = rawMsg
          if (isOfflineErr) {
            cleanMsg =
              'Connessione a Internet assente o non raggiungibile. Verifica la tua connessione Wi-Fi o di rete e riprova.'
            onOfflineError?.()
          } else if (isAuthErr) {
            cleanMsg =
              'Accesso Google non attivo o da verificare. Per trascrivere è necessario attivare il tuo codice gratuito Google nelle Impostazioni.'
          }
          setErrorMsg(cleanMsg)
          onError?.(cleanMsg)
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
  }, [currentTaskId, onTranscriptionSuccess, onOfflineError, onError])

  const handleTranscribe = useCallback(async () => {
    if (!file) return

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineMsg =
        'Connessione a Internet assente. Verifica la tua connessione Wi-Fi o di rete e riprova.'
      setErrorMsg(offlineMsg)
      onError?.(offlineMsg)
      setStatus('error')
      onOfflineError?.()
      return
    }

    if (!apiKeyValid && apiKeyStatus !== 'unreachable') {
      const authMsg =
        'Accesso Google non attivo o da verificare. Per trascrivere è necessario attivare il tuo codice gratuito Google nelle Impostazioni.'
      setErrorMsg(authMsg)
      onError?.(authMsg)
      setStatus('error')
      return
    }

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
        if (matchedCourse.professor_name)
          formData.append('professor_name', matchedCourse.professor_name)
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
      const isOfflineErr =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        rawMsg.toLowerCase().includes('connessione') ||
        rawMsg.toLowerCase().includes('internet') ||
        rawMsg.toLowerCase().includes('name resolution') ||
        rawMsg.toLowerCase().includes('temporary failure') ||
        rawMsg.toLowerCase().includes('network') ||
        rawMsg.toLowerCase().includes('errno -3') ||
        rawMsg.toLowerCase().includes('errno -2') ||
        rawMsg.toLowerCase().includes('errno 101') ||
        rawMsg.toLowerCase().includes('gaierror') ||
        rawMsg.toLowerCase().includes('getaddrinfo') ||
        rawMsg.toLowerCase().includes('unreachable') ||
        rawMsg.toLowerCase().includes('offline') ||
        rawMsg.toLowerCase().includes('failed to fetch')

      const isAuthErr =
        !isOfflineErr &&
        (rawMsg.includes('401') ||
          rawMsg.toLowerCase().includes('unauthenticated') ||
          rawMsg.toLowerCase().includes('chiave') ||
          rawMsg.toLowerCase().includes('api key') ||
          rawMsg.toLowerCase().includes('codice') ||
          rawMsg.toLowerCase().includes('accesso'))

      let cleanMsg = rawMsg || 'Errore durante la trascrizione.'
      if (isOfflineErr) {
        cleanMsg =
          'Connessione a Internet assente o non raggiungibile. Verifica la tua connessione Wi-Fi o di rete e riprova.'
        onOfflineError?.()
      } else if (isAuthErr) {
        cleanMsg =
          'Accesso Google non attivo o da verificare. Per trascrivere è necessario attivare il tuo codice gratuito Google nelle Impostazioni.'
      }
      setErrorMsg(cleanMsg)
      onError?.(cleanMsg)
      setStatus('error')
      setCurrentTaskId(null)
      setCurrentTask(null)
    }
  }, [
    file,
    apiKeyValid,
    apiKeyStatus,
    enableChapters,
    enableTimestamps,
    preserveAudio,
    uploadCourseId,
    courses,
    onOfflineError,
    onError,
  ])

  const handleSaveEdit = useCallback(
    async (newHtml) => {
      try {
        await updateTranscript(currentRecordId, newHtml)
        setTranscript(newHtml)
        setIsEditing(false)
        setSeekRequest(null)
        onTranscriptionSuccess?.()
      } catch (err) {
        onError?.(err.message)
        alert(err.message)
      }
    },
    [currentRecordId, onTranscriptionSuccess, onError]
  )

  const handleRename = useCallback(
    async (newFilename) => {
      if (!currentRecordId || !newFilename) return
      try {
        await updateTranscript(currentRecordId, { filename: newFilename })
        onRenameSuccess?.(currentRecordId, newFilename)
      } catch (err) {
        onError?.(err.message)
        alert(err.message)
      }
    },
    [currentRecordId, onRenameSuccess, onError]
  )

  const viewHistoryItem = useCallback((item) => {
    setIsEditing(false)
    setSeekRequest(null)
    setCurrentTaskId(null)
    setCurrentTask(null)
    if (item.status === 'success' && item.transcript) {
      setCurrentRecordId(item.id)
      setTranscript(item.transcript)
      setStatus('success')
    }
  }, [])

  const copyToClipboard = useCallback(() => {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = transcript
    navigator.clipboard.writeText(tempDiv.innerText)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }, [transcript])

  const handleExport = useCallback(
    async (format) => {
      try {
        const currentItem = historyList.find((item) => item.id === currentRecordId)
        const originalName = currentItem
          ? currentItem.filename.replace(/^\d+_/, '')
          : 'Trascrizione'
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
        setTimeout(() => window.URL.revokeObjectURL(url), 1000)
      } catch (err) {
        onError?.(err.message)
        alert(err.message)
      }
    },
    [historyList, currentRecordId, transcript, onError]
  )

  const handleSeek = useCallback((seconds) => {
    if (seconds === null || seconds === undefined) {
      setSeekRequest(null)
      return
    }
    setSeekRequest({ time: seconds, id: Date.now() })
  }, [])

  const currentItem = useMemo(
    () => historyList.find((item) => item.id === currentRecordId),
    [historyList, currentRecordId]
  )

  const fileAudioUrl = useMemo(() => {
    if (file && file instanceof File) {
      return URL.createObjectURL(file)
    }
    return null
  }, [file])

  const currentAudioUrl =
    currentItem?.audio_preserved && currentRecordId
      ? getAudioUrl(currentRecordId)
      : fileAudioUrl

  return {
    file,
    setFile,
    isDragging,
    status,
    setStatus,
    transcript,
    setTranscript,
    currentRecordId,
    setCurrentRecordId,
    currentTaskId,
    currentTask,
    seekRequest,
    isEditing,
    setIsEditing,
    isCopied,
    errorMsg,
    setErrorMsg,
    enableChapters,
    setEnableChapters,
    enableTimestamps,
    setEnableTimestamps,
    preserveAudio,
    setPreserveAudio,
    validateAndSetFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    startNewTranscription,
    handleTranscribe,
    handleSaveEdit,
    handleRename,
    viewHistoryItem,
    copyToClipboard,
    handleExport,
    handleSeek,
    currentItem,
    currentAudioUrl,
  }
}
