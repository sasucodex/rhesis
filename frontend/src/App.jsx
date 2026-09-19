import { useState, useEffect, useCallback, useRef } from 'react'
import { FileAudio, Menu, Loader2, AlertCircle } from 'lucide-react'
import { fetchHistory, deleteTranscript } from './services/api'
import { getRelativeMain } from './utils/dateUtils'
import ConfirmDeleteModal from './components/modals/ConfirmDeleteModal'
import OnboardingModal from './components/modals/OnboardingModal'
import SettingsModal from './components/modals/SettingsModal'
import LegalModal from './components/modals/LegalModal'
import ReportIssueModal from './components/modals/ReportIssueModal'
import CourseModal from './components/courses/CourseModal'
import RichTextEditor from './components/editor/RichTextEditor'
import EditorHeader from './components/editor/EditorHeader'
import AudioPlayerSync from './components/editor/AudioPlayerSync'
import Sidebar from './components/layout/Sidebar'
import UploadZone from './components/upload/UploadZone'
import { useAuthStatus } from './hooks/useAuthStatus'
import { useCoursesManager } from './hooks/useCoursesManager'
import { useTranscriptionTask } from './hooks/useTranscriptionTask'
import { useTranscriptFormatter } from './hooks/useTranscriptFormatter'

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [historyList, setHistoryList] = useState([])
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [lastError, setLastError] = useState('')
  const [itemToDelete, setItemToDelete] = useState(null)

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(1)
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false)
  const [legalActiveTab, setLegalActiveTab] = useState('termini')
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false)

  const transcriptContainerRef = useRef(null)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchHistory()
      setHistoryList(data)
    } catch (err) {
      console.error('Errore history:', err)
    }
  }, [])

  const coursesManager = useCoursesManager({
    loadHistory,
    onError: setLastError,
  })

  const { loadCourses } = coursesManager

  const handleAuthSuccess = useCallback(async () => {
    await Promise.all([loadHistory(), loadCourses()])
  }, [loadHistory, loadCourses])

  const auth = useAuthStatus({
    onAuthSuccess: handleAuthSuccess,
    onAuthError: setLastError,
  })

  const { setApiKeyValid, setApiKeyStatus } = auth

  const handleOfflineError = useCallback(() => {
    setApiKeyValid(false)
    setApiKeyStatus('unreachable')
  }, [setApiKeyValid, setApiKeyStatus])

  const handleRenameSuccess = useCallback((id, filename) => {
    setHistoryList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, filename } : item))
    )
  }, [])

  const transcriptionTask = useTranscriptionTask({
    apiKeyValid: auth.apiKeyValid,
    apiKeyStatus: auth.apiKeyStatus,
    courses: coursesManager.courses,
    uploadCourseId: coursesManager.uploadCourseId,
    setUploadCourseId: coursesManager.setUploadCourseId,
    selectedCourseId: coursesManager.selectedCourseId,
    historyList,
    onTranscriptionSuccess: handleAuthSuccess,
    onRenameSuccess: handleRenameSuccess,
    onOfflineError: handleOfflineError,
    onError: setLastError,
  })

  const { formattedTranscript, handleTimestampClick } = useTranscriptFormatter({
    transcript: transcriptionTask.transcript,
    activeSearchQuery,
    currentRecordId: transcriptionTask.currentRecordId,
    onSeek: transcriptionTask.handleSeek,
    containerRef: transcriptContainerRef,
  })

  const handleDelete = async (id) => {
    try {
      await deleteTranscript(id)
      setItemToDelete(null)
      if (transcriptionTask.currentRecordId === id) {
        transcriptionTask.startNewTranscription()
      }
      await Promise.all([loadHistory(), coursesManager.loadCourses()])
    } catch (err) {
      setLastError(err.message || 'Errore durante la cancellazione.')
      console.error('Errore cancellazione:', err)
    }
  }

  const openSettings = () => {
    auth.checkAuthStatus()
    setIsSettingsOpen(true)
  }

  const handleSaveSettings = async ({
    newApiKey,
    enableChapters: newChapters,
    enableTimestamps: newTimestamps,
    preserveAudio: newPreserveAudio,
  }) => {
    transcriptionTask.setEnableChapters(newChapters)
    transcriptionTask.setEnableTimestamps(newTimestamps)
    transcriptionTask.setPreserveAudio(newPreserveAudio)
    localStorage.setItem('rhesis_chapters', newChapters)
    localStorage.setItem('rhesis_timestamps', newTimestamps)
    localStorage.setItem('rhesis_preserve_audio', newPreserveAudio)

    if (newApiKey) {
      try {
        await auth.saveApiKey(newApiKey)
        setIsSettingsOpen(false)
        await Promise.all([loadHistory(), coursesManager.loadCourses()])
      } catch {
        return
      }
    } else {
      setIsSettingsOpen(false)
    }
  }

  const handleLogout = async () => {
    try {
      await auth.handleLogout()
      setIsSettingsOpen(false)
    } catch (err) {
      alert(err.message || 'Errore durante la disconnessione.')
    }
  }

  const handleSetupModalSubmit = async (keyParam) => {
    await auth.handleSetupSubmit(keyParam)
    setIsSettingsOpen(false)
    setIsOnboardingOpen(false)
  }

  if (auth.view === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-900 dark:text-zinc-100 animate-spin" />
      </div>
    )
  }

  if (auth.view === 'setup') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center p-4 transition-colors">
        <OnboardingModal
          isOpen={true}
          onComplete={handleSetupModalSubmit}
          canClose={false}
          initialErrorMsg={auth.setupError}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden relative">
      <Sidebar
        historyList={historyList}
        courses={coursesManager.courses}
        selectedCourseId={coursesManager.selectedCourseId}
        onSelectCourse={coursesManager.setSelectedCourseId}
        onCreateCourse={coursesManager.handleOpenCreateCourse}
        onEditCourse={coursesManager.handleOpenEditCourse}
        onAssignCourse={(recordId, courseId) =>
          coursesManager.handleChangeLessonCourse(
            recordId,
            courseId,
            transcriptionTask.currentRecordId
          )
        }
        currentRecordId={transcriptionTask.currentRecordId}
        onSelectRecord={transcriptionTask.viewHistoryItem}
        onNewTranscription={transcriptionTask.startNewTranscription}
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
          {!auth.apiKeyValid && auth.apiKeyStatus !== 'unreachable' && (
            <div className="w-full p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200 animate-in fade-in duration-300">
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="text-sm font-semibold">
                    Accesso Google: Non collegato o da verificare
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    Per poter trascrivere nuove lezioni universitarie è necessario attivare il tuo codice gratuito Google nelle Impostazioni.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openSettings}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shadow-xs shrink-0 self-start sm:self-auto"
              >
                Attiva Accesso Gratuito
              </button>
            </div>
          )}

          {transcriptionTask.status === 'success' && transcriptionTask.transcript ? (
            <div
              className={`w-full bg-white dark:bg-[#131314] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col ${
                transcriptionTask.isEditing ? 'h-[600px]' : ''
              }`}
            >
              {!transcriptionTask.isEditing && (
                <EditorHeader
                  filename={
                    transcriptionTask.currentItem?.filename ||
                    (transcriptionTask.file ? transcriptionTask.file.name : 'Trascrizione')
                  }
                  dateStr={
                    transcriptionTask.currentItem?.created_at
                      ? getRelativeMain(transcriptionTask.currentItem.created_at)
                      : ''
                  }
                  isEditing={transcriptionTask.isEditing}
                  isCopied={transcriptionTask.isCopied}
                  onRename={transcriptionTask.handleRename}
                  onCopy={transcriptionTask.copyToClipboard}
                  onExport={transcriptionTask.handleExport}
                  onEditToggle={() => transcriptionTask.setIsEditing(true)}
                />
              )}
              {transcriptionTask.currentAudioUrl && (
                <AudioPlayerSync
                  audioUrl={transcriptionTask.currentAudioUrl}
                  seekRequest={transcriptionTask.seekRequest}
                />
              )}
              {!transcriptionTask.isEditing ? (
                <div
                  ref={transcriptContainerRef}
                  className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar flex-1"
                  onClick={handleTimestampClick}
                >
                  <div
                    className="prose dark:prose-invert prose-zinc max-w-none prose-lg"
                    dangerouslySetInnerHTML={{
                      __html: formattedTranscript,
                    }}
                  />
                </div>
              ) : (
                <RichTextEditor
                  content={transcriptionTask.transcript}
                  onSeek={transcriptionTask.handleSeek}
                  onSave={transcriptionTask.handleSaveEdit}
                  onCancel={() => {
                    transcriptionTask.setIsEditing(false)
                    transcriptionTask.handleSeek(null)
                  }}
                />
              )}
            </div>
          ) : (
            <UploadZone
              file={transcriptionTask.file}
              status={transcriptionTask.status}
              errorMsg={transcriptionTask.errorMsg}
              isDragging={transcriptionTask.isDragging}
              onFileSelect={transcriptionTask.handleFileSelect}
              onTranscribe={transcriptionTask.handleTranscribe}
              onDragOver={transcriptionTask.handleDragOver}
              onDragLeave={transcriptionTask.handleDragLeave}
              onDrop={transcriptionTask.handleDrop}
              task={transcriptionTask.currentTask}
              courses={coursesManager.courses}
              selectedCourseId={coursesManager.uploadCourseId}
              onSelectCourse={coursesManager.setUploadCourseId}
              onCreateCourse={coursesManager.handleOpenCreateCourse}
              onOpenSettings={openSettings}
              apiKeyValid={auth.apiKeyValid}
              apiKeyStatus={auth.apiKeyStatus}
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
          apiKeyValid={auth.apiKeyValid}
          apiKeyStatus={auth.apiKeyStatus}
          isValidatingKey={auth.isValidatingKey}
          settingsError={auth.settingsError}
          setSettingsError={auth.setSettingsError}
          enableChapters={transcriptionTask.enableChapters}
          enableTimestamps={transcriptionTask.enableTimestamps}
          preserveAudio={transcriptionTask.preserveAudio}
          onSave={handleSaveSettings}
          onOpenOnboarding={(step = 1) => {
            setOnboardingInitialStep(typeof step === 'number' ? step : 1)
            setIsSettingsOpen(false)
            setIsOnboardingOpen(true)
          }}
          onLogout={handleLogout}
          onOpenLegal={(tab) => {
            setLegalActiveTab(tab || 'termini')
            setIsLegalModalOpen(true)
          }}
          onOpenReportIssue={() => setIsReportIssueOpen(true)}
        />
      )}

      <CourseModal
        isOpen={coursesManager.isCourseModalOpen}
        onClose={coursesManager.handleCloseCourseModal}
        onSave={(data) =>
          coursesManager.handleCreateOrUpdateCourse(
            data,
            transcriptionTask.status
          )
        }
        courseToEdit={coursesManager.courseToEdit}
        onDelete={coursesManager.handleDeleteCourse}
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
          onComplete={handleSetupModalSubmit}
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
