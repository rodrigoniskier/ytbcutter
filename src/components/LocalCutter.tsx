/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileVideo, Scissors, Play, Pause, RefreshCw, 
  Trash2, Download, AlertCircle, ShieldCheck, Zap, Sliders, ChevronRight
} from 'lucide-react';
import { formatTime, formatBytes } from '../utils';
import { VideoStats, ProcessingStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface LocalCutterProps {
  initialStartTime: number;
  initialEndTime: number;
  onTimesChange: (start: number, end: number) => void;
}

export default function LocalCutter({ initialStartTime, initialEndTime, onTimesChange }: LocalCutterProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<VideoStats | null>(null);
  
  // Trimming State
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoopingSelection, setIsLoopingSelection] = useState(true);
  const [speed, setSpeed] = useState(2); // Default to 2x processing speed for faster renders
  
  // Processing State
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [trimmedBlobUrl, setTrimmedBlobUrl] = useState<string | null>(null);
  const [trimmedBlobType, setTrimmedBlobType] = useState<string | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const renderVideoRef = useRef<HTMLVideoElement>(null);
  const cancelCallbackRef = useRef<(() => void) | null>(null);
  const isDragOverRef = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sync state with props
  useEffect(() => {
    if (initialStartTime !== startTime && initialStartTime < endTime) {
      setStartTime(initialStartTime);
      if (videoRef.current) {
        videoRef.current.currentTime = initialStartTime;
      }
    }
  }, [initialStartTime]);

  useEffect(() => {
    if (initialEndTime !== endTime && initialEndTime > startTime) {
      setEndTime(initialEndTime);
    }
  }, [initialEndTime]);

  // Handle local file selection
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Arquivo inválido. Por favor, envie apenas arquivos de vídeo (MP4, WebM, etc).');
      return;
    }
    
    // Revoke previous URL if any
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(url);
    setIsPlaying(false);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);
    setStats(null);
    setTrimmedBlobUrl(null);
    setProcessingStatus('idle');
    setProcessingProgress(0);
    setProcessingError(null);
  };

  // Drag and Drop support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Setup video metadata once loaded
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video || !videoFile) return;

    const duration = video.duration;
    setStats({
      duration: duration,
      width: video.videoWidth,
      height: video.videoHeight,
      name: videoFile.name,
      size: videoFile.size
    });

    // Default selection is first 10s or total duration if shorter
    setStartTime(0);
    setEndTime(Math.min(duration, duration > 10 ? 10 : duration));
    onTimesChange(0, Math.min(duration, duration > 10 ? 10 : duration));
  };

  // Loop selection playback logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (isLoopingSelection && video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isPlaying, startTime, endTime, isLoopingSelection]);

  // Triggered when manual sliding or typing updates times
  const handleTimeRangeChange = (startVal: number, endVal: number) => {
    const maxDur = stats?.duration || 0;
    const finalStart = Math.max(0, Math.min(startVal, maxDur));
    const finalEnd = Math.max(finalStart + 0.1, Math.min(endVal, maxDur));
    
    setStartTime(finalStart);
    setEndTime(finalEnd);
    onTimesChange(finalStart, finalEnd);

    // Seek player if needed
    if (videoRef.current) {
      if (videoRef.current.currentTime < finalStart || videoRef.current.currentTime > finalEnd) {
        videoRef.current.currentTime = finalStart;
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // Seek to start if playhead is out of bound
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime;
      }
      video.play();
      setIsPlaying(true);
    }
  };

  // Execute actual trimming locally inside browser
  const handleCutVideo = async () => {
    if (!videoFile || !videoUrl) return;

    setProcessingStatus('preparing');
    setProcessingProgress(0);
    setProcessingError(null);
    setTrimmedBlobUrl(null);

    try {
      const renderVideo = renderVideoRef.current;
      if (!renderVideo) {
        throw new Error('Canal de vídeo para renderização não disponível.');
      }

      // Load file into render video
      renderVideo.src = videoUrl;
      renderVideo.currentTime = startTime;
      renderVideo.muted = true; // Mute render track during high-speed process to protect ears

      // Wait for exact start-frame seek
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          renderVideo.removeEventListener('seeked', onSeeked);
          resolve();
        };
        const onError = (e) => {
          renderVideo.removeEventListener('error', onError);
          reject(new Error('Erro ao buscar o ponto inicial do vídeo.'));
        };
        renderVideo.addEventListener('seeked', onSeeked);
        renderVideo.addEventListener('error', onError);
      });

      // Capture native stream
      const stream = (renderVideo as any).captureStream 
        ? (renderVideo as any).captureStream() 
        : (renderVideo as any).mozCaptureStream 
          ? (renderVideo as any).mozCaptureStream() 
          : null;

      if (!stream) {
        throw new Error('Seu navegador não oferece suporte à captura direta de fluxos de vídeo locais.');
      }

      // Check support codecs
      const codecTypes = [
        'video/mp4;codecs=h264,aac',
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm'
      ];
      let selectedType = '';
      for (const mime of codecTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedType = mime;
          break;
        }
      }

      if (!selectedType) {
        throw new Error('Nenhum codificador de mídia suportado encontrado no seu navegador.');
      }

      setTrimmedBlobType(selectedType);

      // Create recorder
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps High Quality
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const trimmedBlob = new Blob(chunks, { type: selectedType });
        const trimmedUrl = URL.createObjectURL(trimmedBlob);
        setTrimmedBlobUrl(trimmedUrl);
        setProcessingStatus('completed');

        // Automatically trigger browser download
        const ext = selectedType.includes('mp4') ? 'mp4' : 'webm';
        const rawName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || videoFile.name;
        const fileDownloadName = `${rawName}_corte.${ext}`;

        const a = document.createElement('a');
        a.href = trimmedUrl;
        a.download = fileDownloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      // Set speed and start recording
      renderVideo.playbackRate = speed;
      recorder.start(100); // Collect data chunk every 100ms
      renderVideo.play();
      setProcessingStatus('recording');

      const totalToTrim = endTime - startTime;
      
      const checkProgressInterval = setInterval(() => {
        const cur = renderVideo.currentTime;
        if (cur >= endTime || renderVideo.ended) {
          clearInterval(checkProgressInterval);
          renderVideo.pause();
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
          setProcessingStatus('finalizing');
        } else {
          const elapsed = cur - startTime;
          const percentage = Math.min(100, Math.max(0, (elapsed / totalToTrim) * 100));
          setProcessingProgress(Math.floor(percentage));
        }
      }, 50);

      // Save cancel handler
      cancelCallbackRef.current = () => {
        clearInterval(checkProgressInterval);
        renderVideo.pause();
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        setProcessingStatus('idle');
        setProcessingProgress(0);
      };

    } catch (err: any) {
      console.error(err);
      setProcessingStatus('error');
      setProcessingError(err.message || 'Ocorreu um erro interno no motor de renderização do navegador.');
    }
  };

  const handleCancelProcessing = () => {
    if (cancelCallbackRef.current) {
      cancelCallbackRef.current();
    }
  };

  const handleClear = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(null);
    setVideoUrl(null);
    setStats(null);
    setStartTime(0);
    setEndTime(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setTrimmedBlobUrl(null);
    setProcessingStatus('idle');
  };

  const durationSelected = endTime - startTime;

  return (
    <div className="flex flex-col gap-6" id="local-cutter-root">
      
      {/* Invisible render node */}
      <video 
        ref={renderVideoRef} 
        className="fixed opacity-0 pointer-events-none" 
        style={{ width: '1px', height: '1px', left: '-10px', top: '-10px' }}
      />

      {!videoUrl ? (
        /* Drag & Drop Zone */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center border border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer min-h-[350px] ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50/40' 
              : 'border-slate-200 hover:border-blue-400 bg-slate-50/30'
          }`}
          onClick={() => document.getElementById('video-selector')?.click()}
          id="dropzone-container"
        >
          <input
            type="file"
            id="video-selector"
            accept="video/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-5 shadow-sm">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="font-sans font-semibold text-slate-800 text-lg mb-2">
            Arraste seu vídeo aqui
          </h3>
          <p className="font-sans text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
            Ou clique para procurar em seu computador. Aceita formatos MP4, WebM, OGG e mais.
          </p>

          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-medium font-sans">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Processamento local: Seus arquivos nunca saem do seu computador</span>
          </div>
        </div>
      ) : (
        /* Cutting Studio Panel */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="studio-grid">
          
          {/* Main Video Viewport (left column) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 group">
              <video
                ref={videoRef}
                src={videoUrl}
                onLoadedMetadata={handleLoadedMetadata}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
                id="preview-player"
              />
              
              {/* Floating controller panel */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg opacity-90 group-hover:opacity-100 transition-opacity border border-slate-200/40">
                <button
                  id="preview-play-btn"
                  onClick={togglePlay}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white" />}
                </button>

                <div className="h-4 w-px bg-slate-200"></div>

                <div className="flex items-center gap-1 font-mono text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{formatTime(currentTime, true)}</span>
                  <span className="text-slate-400">/</span>
                  <span>{formatTime(stats?.duration || 0, true)}</span>
                </div>
              </div>
            </div>

            {/* Quick-action buttons underneath the viewer */}
            <div className="flex items-center justify-between px-1">
              <div className="flex gap-2">
                <button
                  id="mark-start-playhead"
                  onClick={() => {
                    if (videoRef.current) {
                      handleTimeRangeChange(videoRef.current.currentTime, endTime);
                    }
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-sans font-medium transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  Definir Playhead como Início
                </button>
                <button
                  id="mark-end-playhead"
                  onClick={() => {
                    if (videoRef.current) {
                      handleTimeRangeChange(startTime, videoRef.current.currentTime);
                    }
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-sans font-medium transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 shadow-2xs"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  Definir Playhead como Fim
                </button>
              </div>

              {/* Loop option toggler */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="loop-selection-checkbox"
                  type="checkbox"
                  checked={isLoopingSelection}
                  onChange={(e) => setIsLoopingSelection(e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-500 border-slate-300"
                />
                <span className="text-xs font-sans text-slate-500 font-medium">
                  Loopar seleção do corte
                </span>
              </label>
            </div>
          </div>

          {/* Timeline & Parameters Panel (right column) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 bg-slate-50 border border-slate-200/60 rounded-2xl gap-6">
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileVideo className="w-5 h-5 text-slate-700" />
                  <h4 className="font-sans font-semibold text-slate-800 text-sm truncate max-w-[200px]">
                    {stats?.name}
                  </h4>
                </div>
                <button
                  id="discard-video-btn"
                  onClick={handleClear}
                  className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                  title="Descartar vídeo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Statistics Details */}
              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200/50 shadow-2xs text-[11px] font-mono text-slate-500">
                <div>
                  <span>Tamanho:</span>{' '}
                  <strong className="text-slate-700">{formatBytes(stats?.size || 0)}</strong>
                </div>
                <div>
                  <span>Resolução:</span>{' '}
                  <strong className="text-slate-700">
                    {stats?.width}x{stats?.height}
                  </strong>
                </div>
              </div>

              <div className="h-px bg-slate-200"></div>

              {/* Time Range Selector */}
              <div className="flex flex-col gap-4">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-slate-400" />
                  Intervalo de Corte
                </h5>

                {/* Timeline Range Slider Bar */}
                <div className="relative pt-2 pb-6 px-1">
                  {/* Slider background */}
                  <div className="absolute h-1.5 top-5 left-1 right-1 bg-slate-200 rounded-full"></div>
                  
                  {/* Highlighted active section */}
                  {stats && (
                    <div 
                      className="absolute h-1.5 top-5 bg-slate-900 rounded-full"
                      style={{
                        left: `${(startTime / stats.duration) * 100}%`,
                        width: `${((endTime - startTime) / stats.duration) * 100}%`
                      }}
                    ></div>
                  )}

                  {/* Dual ranges */}
                  {stats && (
                    <>
                      <input
                        id="timeline-start-slider"
                        type="range"
                        min="0"
                        max={stats.duration}
                        step="0.05"
                        value={startTime}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleTimeRangeChange(val, Math.max(val + 0.1, endTime));
                        }}
                        className="absolute w-full h-1 top-4 left-0 outline-none pointer-events-none appearance-none [&::-webkit-slider-thumb]:pointer-events-auto"
                        style={{ background: 'none' }}
                      />
                      <input
                        id="timeline-end-slider"
                        type="range"
                        min="0"
                        max={stats.duration}
                        step="0.05"
                        value={endTime}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleTimeRangeChange(Math.min(val - 0.1, startTime), val);
                        }}
                        className="absolute w-full h-1 top-4 left-0 outline-none pointer-events-none appearance-none [&::-webkit-slider-thumb]:pointer-events-auto"
                        style={{ background: 'none' }}
                      />
                    </>
                  )}
                </div>

                {/* Time values fine adjustment inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Início</span>
                    <input
                      id="manual-input-start"
                      type="number"
                      step="0.1"
                      min="0"
                      max={endTime}
                      value={startTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleTimeRangeChange(val, endTime);
                      }}
                      className="w-full font-mono text-sm font-semibold text-slate-800 bg-transparent outline-none focus:text-slate-900"
                    />
                    <span className="text-[10px] font-mono text-slate-400 block mt-1">
                      {formatTime(startTime, true)}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Fim</span>
                    <input
                      id="manual-input-end"
                      type="number"
                      step="0.1"
                      min={startTime}
                      max={stats?.duration || 0}
                      value={endTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleTimeRangeChange(startTime, val);
                      }}
                      className="w-full font-mono text-sm font-semibold text-slate-800 bg-transparent outline-none focus:text-slate-900"
                    />
                    <span className="text-[10px] font-mono text-slate-400 block mt-1">
                      {formatTime(endTime, true)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-100 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-sans text-slate-600">Duração do trecho:</span>
                  <span className="font-mono text-sm font-bold text-slate-900">{formatTime(durationSelected, true)}</span>
                </div>
              </div>

              {/* Rendering Engine Parameters */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Velocidade de Processamento
                </span>
                <div className="grid grid-cols-3 gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  {[1, 2, 4].map((v) => (
                    <button
                      id={`speed-btn-${v}x`}
                      key={v}
                      type="button"
                      onClick={() => setSpeed(v)}
                      className={`py-2 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                        speed === v 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {v}x {v === 2 ? '(Rápido)' : v === 4 ? '(Turbo)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Render Trigger Button */}
            <button
              id="start-cut-btn"
              onClick={handleCutVideo}
              disabled={processingStatus !== 'idle' && processingStatus !== 'completed' && processingStatus !== 'error'}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-200 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-3 cursor-pointer"
            >
              <Scissors className="w-4 h-4" />
              Cortar Vídeo e Baixar MP4
            </button>
          </div>
        </div>
      )}

      {/* Modern Overlay Modal for Processing Progress & Queue */}
      <AnimatePresence>
        {processingStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            id="processing-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-gray-100 flex flex-col items-center text-center gap-6"
            >
              {/* Spinner & State icons */}
              <div className="relative">
                {processingStatus === 'recording' || processingStatus === 'preparing' ? (
                  <div className="w-20 h-20 rounded-full border-4 border-gray-100 border-t-blue-600 animate-spin flex items-center justify-center" id="spinner-animation">
                    <Scissors className="w-6 h-6 text-blue-500 animate-pulse" />
                  </div>
                ) : processingStatus === 'completed' ? (
                  <div className="w-20 h-20 rounded-full bg-green-50 border-4 border-green-200 flex items-center justify-center text-green-600" id="success-animation">
                    <Download className="w-8 h-8 animate-bounce" />
                  </div>
                ) : processingStatus === 'error' ? (
                  <div className="w-20 h-20 rounded-full bg-red-50 border-4 border-red-200 flex items-center justify-center text-red-600" id="error-animation">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-gray-100 border-t-blue-400 animate-spin flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-pulse" />
                  </div>
                )}

                {/* Micro speed tag */}
                {(processingStatus === 'recording' || processingStatus === 'preparing') && (
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                    <Zap className="w-2 h-2" /> {speed}x
                  </span>
                )}
              </div>

              {/* Status text details */}
              <div className="flex flex-col gap-1.5">
                <h3 className="font-sans font-bold text-gray-800 text-lg">
                  {processingStatus === 'preparing' && 'Preparando motor...'}
                  {processingStatus === 'recording' && 'Cortando trecho de vídeo...'}
                  {processingStatus === 'finalizing' && 'Finalizando arquivo final...'}
                  {processingStatus === 'completed' && 'Corte concluído!'}
                  {processingStatus === 'error' && 'Erro no corte'}
                </h3>
                
                <p className="font-sans text-xs text-gray-500 max-w-xs leading-relaxed">
                  {processingStatus === 'preparing' && 'Carregando buffer de vídeo no navegador...'}
                  {processingStatus === 'recording' && 'Renderizando os quadros de vídeo e áudio de forma ultra-rápida.'}
                  {processingStatus === 'finalizing' && 'Agrupando fragmentos de mídia e empacotando em MP4/WebM.'}
                  {processingStatus === 'completed' && 'O arquivo MP4 foi gerado e baixado automaticamente.'}
                  {processingStatus === 'error' && processingError}
                </p>
              </div>

              {/* Graphical Progress Bar */}
              {(processingStatus === 'recording' || processingStatus === 'finalizing') && (
                <div className="w-full flex flex-col gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between font-mono text-[10px] text-gray-500 font-semibold">
                    <span>PROGRESSO</span>
                    <span>{processingProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-100 ease-out"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] font-sans text-gray-400 block">
                    Velocidade: {speed}x ({speed === 4 ? 'Acelerado com aceleração de hardware' : speed === 2 ? 'Equilibrado' : 'Seguro'})
                  </span>
                </div>
              )}

              {/* Dialog buttons block */}
              <div className="flex gap-2.5 w-full mt-2">
                {processingStatus === 'completed' && (
                  <>
                    <button
                      id="download-again-btn"
                      onClick={() => {
                        if (trimmedBlobUrl) {
                          const ext = trimmedBlobType?.includes('mp4') ? 'mp4' : 'webm';
                          const rawName = videoFile?.name.substring(0, videoFile?.name.lastIndexOf('.')) || 'video';
                          const fileDownloadName = `${rawName}_corte.${ext}`;
                          const a = document.createElement('a');
                          a.href = trimmedBlobUrl;
                          a.download = fileDownloadName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }
                      }}
                      className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-sans font-semibold text-xs transition-all cursor-pointer"
                    >
                      Baixar Novamente
                    </button>
                    <button
                      id="close-success-btn"
                      onClick={() => setProcessingStatus('idle')}
                      className="flex-1 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-sans font-semibold text-xs transition-all cursor-pointer"
                    >
                      Voltar ao Estúdio
                    </button>
                  </>
                )}

                {processingStatus === 'error' && (
                  <button
                    id="close-error-btn"
                    onClick={() => setProcessingStatus('idle')}
                    className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-sans font-semibold text-xs transition-all cursor-pointer"
                  >
                    Fechar e Corrigir
                  </button>
                )}

                {(processingStatus === 'recording' || processingStatus === 'preparing') && (
                  <button
                    id="cancel-cut-btn"
                    onClick={handleCancelProcessing}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-sans font-semibold text-xs transition-all cursor-pointer"
                  >
                    Cancelar Corte
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
