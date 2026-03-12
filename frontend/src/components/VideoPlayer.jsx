import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize,
  FiSkipForward, FiSkipBack
} from 'react-icons/fi';
import { MdOutlineSpeed, MdHd, MdSdCard, MdOutlineTheaters } from 'react-icons/md';
import { TbPictureInPicture } from 'react-icons/tb';

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function VideoPlayer({ src, onTimeUpdate, onEnded, thumbnail }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const progressRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('Auto');
  const [centerIcon, setCenterIcon] = useState(null); // 'play' | 'pause' | 'forward' | 'back'
  const [seekPreview, setSeekPreview] = useState({ visible: false, x: 0, time: 0 });
  const [theaterMode, setTheaterMode] = useState(false);

  const flashCenter = useCallback((type) => {
    setCenterIcon(type);
    setTimeout(() => setCenterIcon(null), 500);
  }, []);

  // Initialize HLS
  useEffect(() => {
    if (!src || !videoRef.current) return;
    const video = videoRef.current;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const isHLS = src.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map((l, i) => ({
          index: i,
          label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`,
        }));
        setQualities([{ index: -1, label: 'Auto' }, ...levels]);
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari)
      video.src = src;
      setLoading(false);
    } else {
      // Fallback (MP4 or direct)
      video.src = src;
      setLoading(false);
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [src]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdateFn = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
      if (onTimeUpdate) {
        onTimeUpdate({
          currentTime: video.currentTime,
          duration: video.duration || 0,
          percentage: video.duration ? (video.currentTime / video.duration) * 100 : 0,
        });
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEndedFn = () => { setPlaying(false); if (onEnded) onEnded(); };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdateFn);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEndedFn);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdateFn);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEndedFn);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, [onTimeUpdate, onEnded]);

  // Fullscreen listener
  useEffect(() => {
    const onFSChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          flashCenter('forward');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          flashCenter('back');
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
        case 'm':
          video.muted = !video.muted;
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          setTheaterMode((p) => !p);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      flashCenter('play');
    } else {
      video.pause();
      flashCenter('pause');
    }
  }, [flashCenter]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch { /* ignore */ }
  }, []);

  const handleProgressClick = useCallback((e) => {
    const bar = progressRef.current;
    if (!bar || !videoRef.current) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = Math.max(0, Math.min(ratio * duration, duration));
  }, [duration]);

  const handleProgressMouseMove = useCallback((e) => {
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const time = Math.max(0, Math.min(ratio * duration, duration));
    setSeekPreview({ visible: true, x: e.clientX - rect.left, time });
  }, [duration]);

  const handleProgressMouseLeave = useCallback(() => {
    setSeekPreview({ visible: false, x: 0, time: 0 });
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const v = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
    setVolume(v);
    setMuted(v === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const changeSpeed = useCallback((speed) => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  }, []);

  const changeQuality = useCallback((q) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = q.index;
    }
    setCurrentQuality(q.label);
    setShowQualityMenu(false);
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (playing) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`mytube-player group ${!showControls && playing ? 'controls-hidden' : ''} ${theaterMode ? 'w-full' : ''}`}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => { if (playing) setShowControls(false); setShowSpeedMenu(false); setShowQualityMenu(false); }}
      onClick={(e) => {
        if (e.target === containerRef.current || e.target === videoRef.current) {
          togglePlay();
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-black"
        poster={thumbnail}
        playsInline
        preload="metadata"
      />

      {/* Loading Spinner */}
      {loading && (
        <div className="player-overlay">
          <div className="w-12 h-12 border-2 border-white/20 border-t-olive-400 rounded-full animate-spin" />
        </div>
      )}

      {/* Center icon flash */}
      {centerIcon && (
        <div className="player-overlay pointer-events-none">
          <div className="center-icon-pop bg-black/40 rounded-full p-5">
            {centerIcon === 'play' && <FiPlay size={32} className="text-white" />}
            {centerIcon === 'pause' && <FiPause size={32} className="text-white" />}
            {centerIcon === 'forward' && (
              <div className="flex items-center gap-1 text-white font-bold">
                <FiSkipForward size={28} />
                <span className="text-sm">10s</span>
              </div>
            )}
            {centerIcon === 'back' && (
              <div className="flex items-center gap-1 text-white font-bold">
                <FiSkipBack size={28} />
                <span className="text-sm">10s</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Big play button (when paused and not loading) */}
      {!playing && !loading && (
        <div className="player-overlay pointer-events-none">
          <button
            className="pointer-events-auto bg-olive-600/90 hover:bg-olive-500 rounded-full p-5 transition-colors shadow-xl"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          >
            <FiPlay size={36} className="text-white translate-x-0.5" />
          </button>
        </div>
      )}

      {/* ── Speed popup ── */}
      {showSpeedMenu && (
        <div className="player-speed-panel" onClick={(e) => e.stopPropagation()}>
          <div className="settings-item text-olive-500 text-[11px] uppercase tracking-wider pointer-events-none">Speed</div>
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
            <div key={s} className={`settings-item ${playbackSpeed === s ? 'active' : ''}`} onClick={() => changeSpeed(s)}>
              {s === 1 ? 'Normal (1×)' : `${s}×`}
            </div>
          ))}
        </div>
      )}

      {/* ── Quality popup ── */}
      {showQualityMenu && qualities.length > 1 && (
        <div className="player-quality-panel" onClick={(e) => e.stopPropagation()}>
          <div className="settings-item text-olive-500 text-[11px] uppercase tracking-wider pointer-events-none">Quality</div>
          {qualities.map((q) => (
            <div key={q.index} className={`settings-item justify-between ${currentQuality === q.label ? 'active' : ''}`} onClick={() => changeQuality(q)}>
              <span>{q.label}</span>
              {currentQuality === q.label && <span className="text-olive-500 text-xs">✓</span>}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div
        className="player-controls"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="progress-container"
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          <div className="progress-buffered" style={{ width: `${buffered}%` }} />
          <div className="progress-fill" style={{ width: `${progress}%` }} />

          {/* Seek preview tooltip */}
          {seekPreview.visible && (
            <div
              className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap"
              style={{ left: seekPreview.x }}
            >
              {formatTime(seekPreview.time)}
            </div>
          )}
        </div>

        {/* Control buttons row */}
        <div className="flex items-center gap-2">
          {/* Left controls */}
          <button
            className="text-white/90 hover:text-white p-1 transition-colors"
            onClick={togglePlay}
            title={playing ? 'Pause (k)' : 'Play (k)'}
          >
            {playing ? <FiPause size={20} /> : <FiPlay size={20} />}
          </button>

          <button
            className="text-white/70 hover:text-white p-1 transition-colors"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                flashCenter('back');
              }
            }}
            title="Rewind 10s (←)"
          >
            <FiSkipBack size={18} />
          </button>

          <button
            className="text-white/70 hover:text-white p-1 transition-colors"
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
                flashCenter('forward');
              }
            }}
            title="Forward 10s (→)"
          >
            <FiSkipForward size={18} />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 group/vol">
            <button
              className="text-white/90 hover:text-white p-1 transition-colors"
              onClick={toggleMute}
              title="Mute (m)"
            >
              {muted || volume === 0 ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider w-0 group-hover/vol:w-18 transition-all overflow-hidden opacity-0 group-hover/vol:opacity-100"
              title="Volume"
            />
          </div>

          {/* Time display */}
          <span className="text-white/80 text-xs font-mono ml-1 select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Speed button */}
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-bold ${showSpeedMenu ? 'text-olive-400 bg-olive-900/50' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            onClick={(e) => { e.stopPropagation(); setShowSpeedMenu((p) => !p); setShowQualityMenu(false); }}
            title="Playback speed"
          >
            <MdOutlineSpeed size={18} />
            <span>{playbackSpeed === 1 ? '1×' : `${playbackSpeed}×`}</span>
          </button>

          {/* Quality button */}
          {qualities.length > 1 && (
            <button
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-bold ${showQualityMenu ? 'text-olive-400 bg-olive-900/50' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
              onClick={(e) => { e.stopPropagation(); setShowQualityMenu((p) => !p); setShowSpeedMenu(false); }}
              title="Quality"
            >
              {(currentQuality === 'Auto' || parseInt(currentQuality) >= 720)
                ? <MdHd size={20} />
                : <MdSdCard size={18} />}
              <span>{currentQuality}</span>
            </button>
          )}

          <button
            className="text-white/70 hover:text-white p-1 transition-colors"
            onClick={togglePiP}
            title="Picture-in-picture"
          >
            <TbPictureInPicture size={18} />
          </button>

          <button
            className={`p-1 transition-colors ${theaterMode ? 'text-olive-400' : 'text-white/70 hover:text-white'}`}
            onClick={() => setTheaterMode((p) => !p)}
            title="Theater mode (t)"
          >
            <MdOutlineTheaters size={18} />
          </button>

          <button
            className="text-white/90 hover:text-white p-1 transition-colors"
            onClick={toggleFullscreen}
            title="Fullscreen (f)"
          >
            {fullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
