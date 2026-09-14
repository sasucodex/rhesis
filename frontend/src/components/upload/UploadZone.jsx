import { useRef } from 'react'
import { UploadCloud, AlertCircle } from 'lucide-react'
import ProcessingStatus from './ProcessingStatus'

export default function UploadZone({
  file,
  status,
  errorMsg,
  isDragging,
  onFileSelect,
  onTranscribe,
  onDragOver,
  onDragLeave,
  onDrop,
  task,
}) {
  const fileInputRef = useRef(null)

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="w-full space-y-8 flex flex-col items-center animate-in fade-in duration-300">
        <ProcessingStatus task={task} file={file} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 flex flex-col items-center">
      {status === 'idle' && !file && (
        <div className="w-full text-center mb-4 mt-8">
          <h2 className="text-4xl font-semibold text-zinc-800 dark:text-zinc-100">
            Ciao, pronto a trascrivere?
          </h2>
        </div>
      )}

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`w-full relative overflow-hidden border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ease-out flex flex-col items-center justify-center gap-4 ${
          isDragging
            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100/80 dark:bg-zinc-800/40 scale-[1.01]'
            : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#131314] hover:border-zinc-400 dark:hover:border-zinc-700 shadow-sm'
        } ${status === 'uploading' || status === 'transcribing' ? 'opacity-50 pointer-events-none' : ''}`}
      >
          <>
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-full shadow-inner mb-2">
              <UploadCloud className="w-10 h-10 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-zinc-700 dark:text-zinc-200">
                {file ? file.name : "Trascina l'audio qui"}
              </h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-[400px] text-center">
                {file
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                  : 'Formati supportati: MP3, M4A, WAV, OGG, FLAC, AAC, MP4, WEBM, MPEG, MPGA, AMR'}
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileSelect}
              className="hidden"
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.flac,.aac,.mp4,.webm,.mpeg,.mpga,.amr"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-white transition-colors shadow-md"
            >
              Sfoglia file
            </button>
          </>
      </div>

      {file && (status === 'idle' || status === 'error') && (
        <div className="flex justify-center w-full animate-in fade-in zoom-in duration-300">
          <button
            type="button"
            onClick={onTranscribe}
            className="px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-base font-semibold rounded-full shadow-lg transition-all active:scale-95"
          >
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
    </div>
  )
}
