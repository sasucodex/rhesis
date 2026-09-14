import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  ChevronDown
} from 'lucide-react'
import { formatTime } from '../../utils/audioUtils'

const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

const AudioPlayerSync = forwardRef(function AudioPlayerSync(
  { audioUrl, onSeek, seekRequest, className = '' },
  ref
) {
  const audioRef = useRef(null)
  const speedMenuRef = useRef(null)
  const lastProcessedSeekIdRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [volume, setVolume] = useState(1.0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useImperativeHandle(ref, () => ({
    seek: (seconds) => {
      if (audioRef.current && !isNaN(seconds)) {
        audioRef.current.currentTime = seconds
        setCurrentTime(seconds)
      }
    },
    play: () => audioRef.current?.play(),
    pause: () => audioRef.current?.pause(),
    getCurrentTime: () => audioRef.current?.currentTime || 0
  }))

  useEffect(() => {
    if (!seekRequest || typeof seekRequest !== 'object') return
    if (seekRequest.id === lastProcessedSeekIdRef.current) return
    lastProcessedSeekIdRef.current = seekRequest.id

    const target = seekRequest.time
    if (isNaN(target)) return
    if (audioRef.current) {
      audioRef.current.currentTime = target
      setCurrentTime(target)
      audioRef.current.play().catch(() => {})
    }
  }, [seekRequest])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target)) {
        setIsSpeedMenuOpen(false)
      }
    }
    if (isSpeedMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSpeedMenuOpen])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
  }

  const handleSkip = (delta) => {
    if (!audioRef.current) return
    const newTime = Math.max(0, Math.min(duration || 0, audioRef.current.currentTime + delta))
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
    if (onSeek) onSeek(newTime)
  }

  const handleSliderChange = (e) => {
    const targetTime = parseFloat(e.target.value)
    setCurrentTime(targetTime)
  }

  const handleSliderCommit = (e) => {
    const targetTime = parseFloat(e.target.value)
    setIsScrubbing(false)
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime
      setCurrentTime(targetTime)
      if (onSeek) onSeek(targetTime)
    }
  }

  const handleSpeedSelect = (speed) => {
    setPlaybackRate(speed)
    setIsSpeedMenuOpen(false)
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    audioRef.current.muted = nextMuted
  }

  const handleVolumeChange = (e) => {
    const nextVol = parseFloat(e.target.value)
    setVolume(nextVol)
    setIsMuted(nextVol === 0)
    if (audioRef.current) {
      audioRef.current.volume = nextVol
      audioRef.current.muted = nextVol === 0
    }
  }

  if (!audioUrl) return null

  return (
    <div
      className={`w-full bg-zinc-50 dark:bg-[#18181b] border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 flex flex-col gap-2 select-none ${className}`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration)
          e.currentTarget.playbackRate = playbackRate
          setCurrentTime(0)
          setIsPlaying(false)
          setLoadError(false)
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          if (!isScrubbing) {
            setCurrentTime(e.currentTarget.currentTime)
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => setLoadError(true)}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSkip(-5)}
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Indietro di 5 secondi"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-full transition-transform active:scale-95 shadow-sm"
            title={isPlaying ? 'Pausa' : 'Riproduci'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => handleSkip(5)}
            className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Avanti di 5 secondi"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap shrink-0 tabular-nums select-none px-1">
            {formatTime(currentTime, duration >= 3600)} / {formatTime(duration, duration >= 3600)}
          </span>
        </div>

        <div className="flex-1 min-w-[120px] mx-2 flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onMouseDown={() => setIsScrubbing(true)}
            onTouchStart={() => setIsScrubbing(true)}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100 focus:outline-none"
            title="Scorri audio"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative" ref={speedMenuRef}>
            <button
              type="button"
              onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
              className="w-16 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-between shrink-0 tabular-nums shadow-sm"
              title="Velocità di riproduzione"
            >
              <span>{playbackRate}x</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {isSpeedMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-24 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 tracking-wider">
                  Velocità
                </div>
                {PLAYBACK_SPEEDS.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleSpeedSelect(speed)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                      playbackRate === speed
                        ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span>{speed}x</span>
                    {playbackRate === speed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 group relative shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title={isMuted ? 'Riattiva audio' : 'Disattiva audio'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-500" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100 focus:outline-none"
              title="Volume"
            />
          </div>
        </div>
      </div>

      {loadError && (
        <div className="text-xs text-amber-600 dark:text-amber-400 font-medium px-2 py-0.5">
          Impossibile caricare lo stream audio per questa lezione.
        </div>
      )}
    </div>
  )
})

export default AudioPlayerSync
