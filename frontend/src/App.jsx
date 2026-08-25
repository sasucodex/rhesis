import { useState, useRef, useEffect } from 'react'
import { 
  UploadCloud, FileAudio, Loader2, CheckCircle, Copy, AlertCircle, Settings, Download, Moon, Sun, MessageSquare, Plus, RefreshCw, Menu,
  Pencil, Bold, Italic, Underline as UnderlineIcon, Undo, Redo, Save, X, Trash2
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'

function getAbsoluteLong(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString + 'Z');
  const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute:'2-digit' });
  return `${d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}, ${timeStr}`;
}

function getRelativeSidebar(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString + 'Z');
  const now = new Date();
  
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((nowDate - dDate) / (1000 * 60 * 60 * 24));
  
  const diffSec = Math.floor((now - d) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffDays === 0) {
    if (diffSec < 60) return "adesso";
    if (diffMin < 60) return `${diffMin}m fa`;
    return `${diffHour}h fa`;
  }
  if (diffDays === 1) return "ieri";
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays}g fa`;
  
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }).replace(/\./g, '');
}

function getRelativeMain(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString + 'Z');
  const now = new Date();
  
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((nowDate - dDate) / (1000 * 60 * 60 * 24));
  
  const diffSec = Math.floor((now - d) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  
  const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute:'2-digit' });

  if (diffDays === 0) {
    if (diffSec < 60) return "adesso";
    if (diffMin < 60) return diffMin === 1 ? "un minuto fa" : `${diffMin} minuti fa`;
    return diffHour === 1 ? "un'ora fa" : `${diffHour} ore fa`;
  }
  if (diffDays === 1) return `ieri alle ${timeStr}`;
  if (diffDays >= 2 && diffDays <= 6) return `${diffDays} giorni fa alle ${timeStr}`;
  
  return getAbsoluteLong(dateString);
}

const RichTextEditor = ({ content, onSave, onCancel }) => {
  const [revision, setRevision] = useState(0)
  
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: content,
    onTransaction: () => {
      setRevision(r => r + 1) 
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-zinc max-w-none focus:outline-none min-h-[400px]',
      },
    },
  })

  if (!editor) return null

  const btnBase = "p-2 rounded transition-all flex items-center justify-center"
  const btnActive = "bg-indigo-100 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-200 ring-2 ring-indigo-500/50 shadow-inner"
  const btnInactive = "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#18181b] px-4 py-3 sticky top-0 z-10 rounded-t-3xl">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            className={`${btnBase} ${editor.isActive('bold') ? btnActive : btnInactive}`}
            title="Grassetto"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            className={`${btnBase} ${editor.isActive('italic') ? btnActive : btnInactive}`}
            title="Corsivo"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editor.chain().focus().toggleUnderline().run()} 
            className={`${btnBase} ${editor.isActive('underline') ? btnActive : btnInactive}`}
            title="Sottolineato"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-2"></div>
          
          <button 
            onClick={() => editor.chain().focus().undo().run()} 
            disabled={!editor.can().undo()} 
            className={`p-2 rounded transition-opacity ${!editor.can().undo() ? 'opacity-30 cursor-not-allowed text-zinc-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
            title="Indietro"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editor.chain().focus().redo().run()} 
            disabled={!editor.can().redo()} 
            className={`p-2 rounded transition-opacity ${!editor.can().redo() ? 'opacity-30 cursor-not-allowed text-zinc-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}
            title="Avanti"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg flex items-center gap-1 transition-colors">
            <X className="w-4 h-4" /> Annulla
          </button>
          <button onClick={() => onSave(editor.getHTML())} className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center gap-1 shadow-sm transition-colors">
            <Save className="w-4 h-4" /> Salva modifiche
          </button>
        </div>
      </div>
      <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#131314]">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

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

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    fetchStatusAndHistory()
  }, [])

  const fetchStatusAndHistory = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/status')
      const data = await res.json()
      if (data.api_key_configured) {
        setView('main')
        fetchHistory()
      } else {
        setView('setup')
      }
    } catch (err) {
      console.error("Server irreperibile:", err)
      setView('main')
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/history')
      if (res.ok) {
        const data = await res.json()
        setHistoryList(data)
      }
    } catch (e) {
      console.error("Errore history:", e)
    }
  }
  
  const handleDelete = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/transcript/${id}`, { method: 'DELETE' });
      setItemToDelete(null);
      if (currentRecordId === id) {
        resetView();
      }
      fetchHistory();
    } catch (error) {
      console.error("Errore cancellazione:", error);
    }
  }

  const handleSetupSubmit = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKeyInput })
      })
      if (!res.ok) throw new Error("Chiave non valida")
      
      setView('main')
      setIsSettingsOpen(false)
      setApiKeyInput('')
      setOriginalTheme(isDarkMode)
      setEnableChapters(tempEnableChapters)
      setEnableTimestamps(tempEnableTimestamps)
      localStorage.setItem('rhesis_chapters', tempEnableChapters)
      localStorage.setItem('rhesis_timestamps', tempEnableTimestamps)
      fetchHistory()
    } catch (e) {
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
    const hasChanges = apiKeyInput.trim() !== '' || isDarkMode !== originalTheme || tempEnableChapters !== enableChapters || tempEnableTimestamps !== enableTimestamps;
    if (hasChanges) {
      setShowUnsavedWarning(true);
    } else {
      setIsSettingsOpen(false);
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
      await handleSetupSubmit();
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
      await fetch('http://127.0.0.1:8000/setup', { method: 'DELETE' })
      setView('setup')
      setIsSettingsOpen(false)
      setApiKeyInput('')
    } catch (e) {
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
    const allowed = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.mp4', '.webm', '.mpeg', '.mpga', '.amr'];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext) && !selectedFile.type.startsWith('audio/')) {
      setErrorMsg(`Formato non supportato: "${ext}". Inserisci un file audio valido.`);
      setStatus('error');
      setFile(null);
      return;
    }
    setErrorMsg('');
    setFile(selectedFile);
    setStatus('idle');
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
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
      const response = await fetch('http://127.0.0.1:8000/transcribe/', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Errore durante la trascrizione')
      
      setCurrentRecordId(data.id)
      setTranscript(data.transcript)
      setStatus('success')
      fetchHistory()
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const handleRetry = async (recordId) => {
    setStatus('uploading')
    setErrorMsg('')
    setTranscript('')
    setFile(null)
    setIsEditing(false)

    try {
      const response = await fetch(`http://127.0.0.1:8000/retry/${recordId}`, {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Errore durante la trascrizione')
      
      setCurrentRecordId(data.id)
      setTranscript(data.transcript)
      setStatus('success')
      fetchHistory()
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const handleSaveEdit = async (newHtml) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/transcript/${currentRecordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: newHtml })
      })
      if (!res.ok) throw new Error("Errore nel salvataggio")
      
      setTranscript(newHtml)
      setIsEditing(false)
      fetchHistory()
    } catch (e) {
      alert(e.message)
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

  const startNewTranscription = () => {
    setStatus('idle')
    setFile(null)
    setTranscript('')
    setErrorMsg('')
    setIsEditing(false)
    setCurrentRecordId(null)
  }

  const copyToClipboard = () => {
    
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = transcript;
    navigator.clipboard.writeText(tempDiv.innerText);
    
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  const handleExport = async (format) => {
    try {
      const currentItem = historyList.find(item => item.id === currentRecordId);
      const originalName = currentItem ? currentItem.filename.replace(/^\d+_/, '') : 'Trascrizione';
      const rawName = originalName.replace(/\.[^/.]+$/, "");
      const absDate = currentItem ? getAbsoluteLong(currentItem.created_at) : '';
      const titleForDoc = absDate ? `${rawName} - ${absDate}` : rawName;
      const fileName = `${titleForDoc}.${format === 'word' ? 'docx' : 'pdf'}`;

      const response = await fetch(`http://127.0.0.1:8000/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: transcript, 
          filename: rawName, 
          date_str: absDate 
        })
      });
      if (!response.ok) throw new Error("Errore durante l'esportazione");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      alert(error.message);
    }
  }

  if (view === 'loading') {
    return <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
  }

  if (view === 'setup') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Benvenuto in Rhesis</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">Per iniziare, abbiamo bisogno della tua API Key di Google AI Studio.</p>
          </div>
          <div className="space-y-4">
            <ol className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2 list-decimal list-inside bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-xl">
              <li>Vai su <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-500 hover:underline">Google AI Studio</a></li>
              <li>Accedi con il tuo account</li>
              <li>Clicca su "Create API Key" e copia il codice</li>
            </ol>
            <input 
              type="password" 
              placeholder="Incolla qui la tua API Key..." 
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button 
              onClick={handleSetupSubmit}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-medium rounded-xl transition-colors shadow-lg shadow-indigo-500/30"
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
      
      <div className={`${isSidebarOpen ? 'w-72 border-r' : 'w-0'} flex-shrink-0 bg-white dark:bg-[#131314] border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out flex flex-col overflow-hidden`}>
        
        <div className="p-4 flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-600 dark:text-zinc-400 shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <FileAudio className="w-6 h-6 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
            Rhesis
          </h1>
        </div>

        <div className="px-4 mt-2 mb-6">
          <button 
            onClick={startNewTranscription}
            className="w-full py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-full flex items-center gap-3 transition-colors text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            Nuova trascrizione
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar min-w-[288px]">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3 px-3 uppercase tracking-wider">Recenti</p>
          
          <div className="space-y-1">
            {historyList.length === 0 && (
              <p className="text-sm text-zinc-400 px-3 mt-2">Nessuna trascrizione.</p>
            )}
            {historyList.map((item) => {
              const isSelected = currentRecordId === item.id;
              
              let bgClass = isSelected ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60";

              return (
                <div 
                  key={item.id} 
                  onClick={() => viewHistoryItem(item)}
                  className={`group w-full text-left py-2 px-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors min-h-[48px] ${bgClass}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-500' : 'text-zinc-400'}`} />
                    <span className={`text-sm truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-zinc-700 dark:text-zinc-300'}`} title={item.filename}>
                      {item.filename.replace(/^\d+_/, '')}
                    </span>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                    <span className="text-xs text-zinc-400 font-medium whitespace-nowrap group-hover:hidden">
                      {getRelativeSidebar(item.created_at)}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1">

                      <button 
                        onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }}
                        title="Elimina"
                        className="p-1 bg-white dark:bg-zinc-700 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/50 dark:hover:border-red-800 rounded transition-all shadow-sm border border-zinc-200 dark:border-zinc-600 group/btn"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-zinc-500 group-hover/btn:text-red-500 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 mt-auto min-w-[288px]">
          <button 
            onClick={openSettings}
            className="w-full py-2.5 px-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 rounded-xl flex items-center gap-3 transition-colors text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            <Settings className="w-5 h-5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            Impostazioni
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar bg-zinc-50 dark:bg-[#09090b] relative">
        
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-3 animate-in fade-in duration-300">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-600 dark:text-zinc-400 shadow-sm bg-white/50 dark:bg-black/20 backdrop-blur-md"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <FileAudio className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              <h1 className="font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">Rhesis</h1>
            </div>
          </div>
        )}

        {isSettingsOpen && (
          <div 
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget && !showUnsavedWarning) handleSettingsCloseAttempt(); }}
          >
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl relative">
              
              {showUnsavedWarning && (
                <div className="absolute inset-0 bg-white/90 dark:bg-zinc-900/95 backdrop-blur-md z-20 rounded-3xl p-8 flex flex-col justify-center items-center text-center animate-in zoom-in-95 duration-200">
                  <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
                  <h4 className="text-xl font-bold mb-2">Modifiche non salvate</h4>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Le tue modifiche alle impostazioni andranno perse. Vuoi procedere?</p>
                  <div className="space-y-3 w-full">
                    <button onClick={discardChanges} className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors">
                      Esci senza salvare
                    </button>
                    <button onClick={() => setShowUnsavedWarning(false)} className="w-full py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-xl font-medium transition-colors">
                      Torna alle impostazioni
                    </button>
                  </div>
                </div>
              )}

              <h3 className="text-xl font-semibold mb-6">Impostazioni</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    <span className="font-medium text-sm">Tema Scuro</span>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${isDarkMode ? 'bg-indigo-500' : 'bg-zinc-300'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-2">Modifica API Key</label>
                  <input 
                    type="password" 
                    placeholder="Nuova API Key..." 
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4 space-y-4">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-2">Opzioni Trascrizione</h4>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">Genera capitoli per argomento</span>
                    <button 
                      onClick={() => setTempEnableChapters(!tempEnableChapters)}
                      className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${tempEnableChapters ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${tempEnableChapters ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="font-medium text-sm text-zinc-700 dark:text-zinc-200">Includi timestamp (minutaggi)</span>
                    <button 
                      onClick={() => setTempEnableTimestamps(!tempEnableTimestamps)}
                      className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${tempEnableTimestamps ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    >
                      <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${tempEnableTimestamps ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4">
                  <button onClick={handleSettingsCloseAttempt} className="flex-1 py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-lg font-medium text-zinc-700 dark:text-zinc-300">Chiudi</button>
                  <button onClick={saveSettings} className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-400 rounded-lg font-medium text-white shadow-md shadow-indigo-500/20">Salva</button>
                </div>
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-4">
                  <button onClick={handleLogout} className="w-full py-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg font-medium transition-colors text-sm">
                    Scollega API Key (Logout)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl space-y-8 mt-12 px-8 pb-16 mx-auto flex flex-col items-center">
          
          {status === 'idle' && !file && (
            <div className="w-full text-center mb-4 mt-8">
              <h2 className="text-4xl font-semibold text-zinc-800 dark:text-zinc-100">
                Ciao, pronto a trascrivere?
              </h2>
            </div>
          )}

          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full relative overflow-hidden border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ease-out flex flex-col items-center justify-center gap-4
              ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/5 scale-[1.02]' : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#131314] hover:border-zinc-400 dark:hover:border-zinc-700 shadow-sm'}
              ${(status === 'uploading' || status === 'transcribing') ? 'opacity-50 pointer-events-none' : ''}
              ${status === 'success' && transcript ? 'hidden' : 'flex'}
            `}
          >
            {status === 'idle' || status === 'error' ? (
              <>
                <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-full shadow-inner mb-2">
                  <UploadCloud className="w-10 h-10 text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-zinc-700 dark:text-zinc-200">{file ? file.name : "Trascina l'audio qui"}</h3>
                  <p className="text-sm text-zinc-500 mt-1 max-w-[400px] text-center">{file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Formati supportati: MP3, M4A, WAV, OGG, FLAC, AAC, MP4, WEBM, MPEG, MPGA, AMR"}</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.mp4,.webm,.mpeg,.mpga,.amr" />
                <button onClick={() => fileInputRef.current.click()} className="mt-4 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-white transition-colors shadow-md">
                  Sfoglia file
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="w-12 h-12 text-indigo-500 dark:text-indigo-400 animate-spin" />
                <h3 className="text-xl font-medium text-zinc-700 dark:text-zinc-200">{status === 'uploading' ? "Caricamento in corso..." : "Analisi dell'audio in corso sul cloud..."}</h3>
                <p className="text-zinc-500 text-sm">Può richiedere qualche minuto per file lunghi.</p>
              </div>
            )}
          </div>

          {file && (status === 'idle' || status === 'error') && (
            <div className="flex justify-center w-full animate-in fade-in zoom-in duration-300">
              <button onClick={handleTranscribe} className="px-10 py-4 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-lg font-semibold rounded-full shadow-xl shadow-indigo-500/30 transition-all transform hover:scale-105 active:scale-95">
                Trascrivi Lezione
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="w-full p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-600 dark:text-red-400 font-medium">Ops, si è verificato un errore</h4>
                <p className="text-red-500/80 dark:text-red-400/80 text-sm mt-1">{errorMsg}</p>
              </div>
            </div>
          )}

          {status === 'success' && transcript && (
            <div className={`w-full bg-white dark:bg-[#131314] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col ${isEditing ? 'h-[600px]' : ''}`}>
              {!isEditing ? (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#131314] flex-wrap gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">Trascrizione completata</span>
                      </div>
                      {historyList.find(item => item.id === currentRecordId) && (
                        <div className="text-zinc-400 text-sm ml-2 font-normal hidden sm:flex items-center gap-2">
                          <span className="text-[10px]">●</span>
                          <span>{getRelativeMain(historyList.find(item => item.id === currentRecordId).created_at)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCopied ? (
                        <button className="p-2 px-3 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-emerald-200 dark:border-emerald-500/30 cursor-default">
                          <CheckCircle className="w-4 h-4" /> Copiato
                        </button>
                      ) : (
                        <button onClick={copyToClipboard} className="p-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700">
                          <Copy className="w-4 h-4" /> Copia
                        </button>
                      )}
                      <button onClick={() => handleExport('word')} className="p-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700">
                        <Download className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Word
                      </button>
                      <button onClick={() => handleExport('pdf')} className="p-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700">
                        <Download className="w-4 h-4 text-red-500 dark:text-red-400" /> PDF
                      </button>
                      <button onClick={() => setIsEditing(true)} className="p-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium border border-zinc-200 dark:border-zinc-700 ml-2">
                        <Pencil className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Modifica
                      </button>
                    </div>
                  </div>
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
          )}
        </div>
      </div>
      
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setItemToDelete(null)}>
          <div className="bg-white dark:bg-[#18181b] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Eliminare la trascrizione?</h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
                Sei sicuro di voler eliminare la trascrizione di <span className="font-semibold text-zinc-800 dark:text-zinc-300">"{itemToDelete.filename.replace(/^\d+_/, '')}"</span>? Questa azione è irreversibile.
              </p>
              
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button 
                  onClick={() => handleDelete(itemToDelete.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
                >
                  Elimina definitivamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
