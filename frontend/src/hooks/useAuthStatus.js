import { useState, useEffect, useCallback, useRef } from 'react'
import { getStatus, setupApiKey, deleteApiKey } from '../services/api'

export function useAuthStatus({ onAuthSuccess, onAuthError }) {
  const [view, setView] = useState('loading')
  const [apiKeyValid, setApiKeyValid] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState('unconfigured')
  const [isValidatingKey, setIsValidatingKey] = useState(false)
  const [setupError, setSetupError] = useState('')
  const [settingsError, setSettingsError] = useState('')

  const fetchStatusWithRetry = async (retries = 2, delay = 800) => {
    let lastErr
    for (let i = 0; i <= retries; i++) {
      try {
        return await getStatus()
      } catch (err) {
        lastErr = err
        if (i < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw lastErr
  }

  const viewRef = useRef(view)
  const onAuthSuccessRef = useRef(onAuthSuccess)
  const onAuthErrorRef = useRef(onAuthError)

  useEffect(() => {
    viewRef.current = view
  }, [view])

  useEffect(() => {
    onAuthSuccessRef.current = onAuthSuccess
    onAuthErrorRef.current = onAuthError
  }, [onAuthSuccess, onAuthError])

  const checkAuthStatus = useCallback(async () => {
    setSettingsError('')
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setApiKeyValid(false)
      setApiKeyStatus('unreachable')
      return
    }
    try {
      const data = await getStatus()
      if (data.api_key_configured) {
        if (data.api_key_status === 'valid' || data.api_key_valid === true) {
          setApiKeyValid(true)
          setApiKeyStatus('valid')
        } else if (data.api_key_status === 'invalid') {
          setApiKeyValid(false)
          setApiKeyStatus('invalid')
        } else if (data.api_key_status === 'unreachable') {
          setApiKeyValid(false)
          setApiKeyStatus('unreachable')
        }
      } else {
        setApiKeyValid(false)
        setApiKeyStatus('unconfigured')
      }
    } catch {
      setApiKeyValid(false)
      setApiKeyStatus('unreachable')
    }
  }, [])

  useEffect(() => {
    let ignore = false

    const init = async () => {
      try {
        const data = await fetchStatusWithRetry()
        if (ignore) return

        if (data.api_key_configured) {
          if (data.api_key_status === 'invalid') {
            setApiKeyValid(false)
            setApiKeyStatus('invalid')
            setView('setup')
            const msg = 'Il codice di accesso salvato non sembra più valido o è scaduto. Inserisci o aggiorna il tuo codice personale.'
            setSetupError(msg)
            onAuthErrorRef.current?.(msg)
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
          if (!ignore) {
            onAuthSuccessRef.current?.()
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
        onAuthErrorRef.current?.(msg)
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
            if (viewRef.current === 'setup') {
              setView('main')
              onAuthSuccessRef.current?.()
            }
          } else if (data.api_key_status === 'invalid') {
            setApiKeyValid(false)
            setApiKeyStatus('invalid')
          } else if (data.api_key_status === 'unreachable') {
            setApiKeyValid(false)
            setApiKeyStatus('unreachable')
          }
        } else {
          setApiKeyValid(false)
          setApiKeyStatus('unconfigured')
        }
      } catch {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setApiKeyValid(false)
          setApiKeyStatus('unreachable')
        }
      }
    }

    const onOnline = () => {
      handleRevalidate()
    }

    const onOffline = () => {
      setApiKeyValid(false)
      setApiKeyStatus('unreachable')
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRevalidate()
      }
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const handleSetupSubmit = async (keyParam) => {
    const keyToValidate = typeof keyParam === 'string' ? keyParam.trim() : ''
    if (!keyToValidate) {
      const msg = 'Inserisci il tuo codice personale prima di proseguire.'
      setSetupError(msg)
      onAuthError?.(msg)
      return
    }
    setIsValidatingKey(true)
    setSetupError('')
    try {
      await setupApiKey(keyToValidate)
      setApiKeyValid(true)
      setApiKeyStatus('valid')
      setView('main')
      await onAuthSuccess?.()
    } catch (err) {
      const msg = err.message || 'Il codice inserito non sembra corretto o è incompleto. Assicurati di averlo copiato per intero e riprova.'
      setSetupError(msg)
      onAuthError?.(msg)
      throw err
    } finally {
      setIsValidatingKey(false)
    }
  }

  const saveApiKey = async (newKey) => {
    setIsValidatingKey(true)
    setSettingsError('')
    try {
      await setupApiKey(newKey)
      setApiKeyValid(true)
      setApiKeyStatus('valid')
      await onAuthSuccess?.()
    } catch (err) {
      const msg = err.message || 'Il codice inserito non sembra corretto o è incompleto. Assicurati di averlo copiato per intero e riprova.'
      setSettingsError(msg)
      onAuthError?.(msg)
      throw err
    } finally {
      setIsValidatingKey(false)
    }
  }

  const handleLogout = async () => {
    try {
      await deleteApiKey()
      setApiKeyValid(false)
      setApiKeyStatus('unconfigured')
      setView('setup')
      setSetupError('')
    } catch (err) {
      const msg = 'Errore durante la disconnessione.'
      onAuthError?.(err.message || msg)
      throw err
    }
  }

  return {
    view,
    setView,
    apiKeyValid,
    setApiKeyValid,
    apiKeyStatus,
    setApiKeyStatus,
    isValidatingKey,
    setupError,
    setSetupError,
    settingsError,
    setSettingsError,
    handleSetupSubmit,
    handleLogout,
    checkAuthStatus,
    saveApiKey,
  }
}
