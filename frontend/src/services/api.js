const BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export async function getStatus() {
  const res = await fetch(`${BASE_URL}/status`)
  if (!res.ok) {
    throw new Error(`Errore server (${res.status})`)
  }
  return res.json()
}

export async function setupApiKey(apiKey) {
  const res = await fetch(`${BASE_URL}/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Chiave non valida')
  }
  return res.json()
}

export async function deleteApiKey() {
  const res = await fetch(`${BASE_URL}/setup`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Errore durante la disconnessione.')
  }
  return res.json()
}

export async function fetchHistory() {
  const res = await fetch(`${BASE_URL}/history`)
  if (!res.ok) {
    throw new Error('Errore nel recupero della cronologia')
  }
  return res.json()
}

export async function transcribeAudio(formData) {
  const res = await fetch(`${BASE_URL}/transcribe/`, {
    method: 'POST',
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || 'Errore durante la trascrizione')
  }
  return data
}

export async function getTaskStatus(taskId) {
  const res = await fetch(`${BASE_URL}/task/${taskId}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || 'Impossibile recuperare lo stato del task')
  }
  return data
}

export async function updateTranscript(recordId, payload, filename) {
  let body = {}
  if (typeof payload === 'string') {
    body.transcript = payload
    if (filename !== undefined) {
      body.filename = filename
    }
  } else if (typeof payload === 'object' && payload !== null) {
    body = { ...payload }
    if (filename !== undefined) {
      body.filename = filename
    }
  }
  const res = await fetch(`${BASE_URL}/transcript/${recordId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Errore nel salvataggio')
  }
  return res.json()
}

export async function deleteTranscript(recordId) {
  const res = await fetch(`${BASE_URL}/transcript/${recordId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Errore durante la cancellazione')
  }
  return res.json()
}

export async function exportDocument(format, payload) {
  const res = await fetch(`${BASE_URL}/export/${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error("Errore durante l'esportazione")
  }
  return res.blob()
}

export function getAudioUrl(recordId) {
  if (!recordId) return null
  return `${BASE_URL}/audio/${recordId}`
}
