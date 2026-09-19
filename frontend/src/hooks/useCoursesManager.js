import { useState, useCallback } from 'react'
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  updateTranscript,
} from '../services/api'

export function useCoursesManager({
  loadHistory,
  onError,
  currentRecordId,
  transcriptionStatus,
  getCurrentRecordId,
  getTranscriptionStatus,
}) {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(null)
  const [uploadCourseId, setUploadCourseId] = useState(null)
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [courseToEdit, setCourseToEdit] = useState(null)

  const loadCourses = useCallback(async () => {
    try {
      const data = await fetchCourses()
      setCourses(data)
    } catch (err) {
      console.error('Errore recupero corsi:', err)
    }
  }, [])

  const handleOpenCreateCourse = useCallback(() => {
    setCourseToEdit(null)
    setIsCourseModalOpen(true)
  }, [])

  const handleOpenEditCourse = useCallback((course) => {
    setCourseToEdit(course)
    setIsCourseModalOpen(true)
  }, [])

  const handleCloseCourseModal = useCallback(() => {
    setIsCourseModalOpen(false)
    setCourseToEdit(null)
  }, [])

  const handleCreateOrUpdateCourse = useCallback(
    async (courseData, statusOverride) => {
      try {
        if (courseToEdit) {
          await updateCourse(courseToEdit.id, courseData)
        } else {
          const created = await createCourse(courseData)
          const currentStatus =
            statusOverride ??
            (getTranscriptionStatus ? getTranscriptionStatus() : transcriptionStatus)
          if (
            currentStatus === 'idle' ||
            currentStatus === 'error' ||
            currentStatus === undefined
          ) {
            setUploadCourseId(created.id)
          }
        }
        await Promise.all([loadCourses(), loadHistory?.()])
      } catch (err) {
        onError?.(err.message || 'Errore durante il salvataggio del corso')
        throw err
      }
    },
    [
      courseToEdit,
      transcriptionStatus,
      getTranscriptionStatus,
      loadCourses,
      loadHistory,
      onError,
    ]
  )

  const handleDeleteCourse = useCallback(
    async (courseId) => {
      try {
        await deleteCourse(courseId)
        if (selectedCourseId === courseId) {
          setSelectedCourseId(null)
        }
        if (uploadCourseId === courseId) {
          setUploadCourseId(null)
        }
        await Promise.all([loadCourses(), loadHistory?.()])
      } catch (err) {
        onError?.(err.message || "Errore durante l'eliminazione del corso")
        throw err
      }
    },
    [selectedCourseId, uploadCourseId, loadCourses, loadHistory, onError]
  )

  const handleChangeLessonCourse = useCallback(
    async (recordId, newCourseId, fallbackRecordId) => {
      const targetId =
        recordId ||
        fallbackRecordId ||
        (getCurrentRecordId ? getCurrentRecordId() : currentRecordId)
      if (!targetId) return
      try {
        await updateTranscript(targetId, {
          course_id: newCourseId ? Number(newCourseId) : 0,
        })
        await Promise.all([loadHistory?.(), loadCourses()])
      } catch (err) {
        const msg = err.message || "Errore durante l'assegnazione del corso"
        onError?.(msg)
        alert(msg)
      }
    },
    [currentRecordId, getCurrentRecordId, loadCourses, loadHistory, onError]
  )

  return {
    courses,
    setCourses,
    selectedCourseId,
    setSelectedCourseId,
    uploadCourseId,
    setUploadCourseId,
    isCourseModalOpen,
    setIsCourseModalOpen,
    courseToEdit,
    setCourseToEdit,
    loadCourses,
    handleOpenCreateCourse,
    handleOpenEditCourse,
    handleCloseCourseModal,
    handleCreateOrUpdateCourse,
    handleDeleteCourse,
    handleChangeLessonCourse,
  }
}
