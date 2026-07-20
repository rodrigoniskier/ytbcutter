/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Youtube, Play, Pause, Bookmark, Info, HelpCircle, FileVideo, ExternalLink, CalendarDays } from 'lucide-react';
import { parseYouTubeId, formatTime } from '../utils';
import { motion } from 'motion/react';

interface YouTubeToolProps {
  onSelectTimes: (start: number, end: number) => void;
  initialStartTime?: number;
  initialEndTime?: number;
}

export default function YouTubeTool({ onSelectTimes, initialStartTime = 0, initialEndTime = 0 }: YouTubeToolProps) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Load YouTube Player API script
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Handle URL change
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = parseYouTubeId(url);
    if (parsedId) {
      setVideoId(parsedId);
      setStartTime(0);
      setEndTime(0);
      setCurrentTime(0);
      setDuration(0);
    } else {
      alert('URL do YouTube inválida. Insira um link válido (ex: https://www.youtube.com/watch?v=...)');
    }
  };

  // Instantiate Player when videoId changes
  useEffect(() => {
    if (!videoId || !(window as any).YT) return;

    let localPlayer: any = null;

    const createPlayer = () => {
      localPlayer = new (window as any).YT.Player('youtube-player-container', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            const videoDuration = event.target.getDuration();
            setDuration(videoDuration);
            setEndTime(Math.min(videoDuration, videoDuration > 30 ? 30 : videoDuration)); // Default to first 30 seconds or full video
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          }
        }
      });
    };

    // If API is already ready, create player directly
    if ((window as any).YT && typeof (window as any).YT.Player === 'function') {
      createPlayer();
    } else {
      // API script is still loading, wait for it
      (window as any).onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    }

    return () => {
      if (localPlayer && typeof localPlayer.destroy === 'function') {
        localPlayer.destroy();
      }
      setPlayer(null);
    };
  }, [videoId]);

  // Poll current player time when playing
  useEffect(() => {
    if (isPlaying && player) {
      timerRef.current = window.setInterval(() => {
        try {
          const time = player.getCurrentTime();
          setCurrentTime(time);
        } catch (e) {
          // Ignore state polling errors
        }
      }, 250);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, player]);

  // Update parent component times when start or end change
  useEffect(() => {
    onSelectTimes(startTime, endTime);
  }, [startTime, endTime]);

  const handleSetStart = () => {
    if (!player) return;
    const time = player.getCurrentTime();
    setStartTime(Math.floor(time * 10) / 10);
    if (endTime < time) {
      setEndTime(Math.min(duration, Math.floor((time + 10) * 10) / 10));
    }
  };

  const handleSetEnd = () => {
    if (!player) return;
    const time = player.getCurrentTime();
    if (time > startTime) {
      setEndTime(Math.floor(time * 10) / 10);
    } else {
      alert('O tempo final deve ser maior que o tempo inicial!');
    }
  };

  const handleSeek = (seconds: number) => {
    if (!player) return;
    player.seekTo(seconds, true);
    setCurrentTime(seconds);
  };

  const selectedDuration = Math.max(0, endTime - startTime);

  return (
    <div className="flex flex-col gap-6" id="youtube-tool-root">
      {/* URL Input Form */}
      <form onSubmit={handleUrlSubmit} className="flex gap-2" id="yt-form">
        <div className="relative flex-1">
          <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            id="yt-url-input"
            type="text"
            placeholder="Cole o link do YouTube aqui (ex: https://www.youtube.com/watch?v=...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-sans text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all text-slate-800 shadow-xs"
          />
        </div>
        <button
          id="yt-load-btn"
          type="submit"
          className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white px-6 py-3 rounded-xl font-medium font-sans text-sm transition-all cursor-pointer shadow-xs flex items-center gap-2"
        >
          Carregar
        </button>
      </form>

      {!videoId ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center p-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-center min-h-[300px]"
          id="yt-placeholder"
        >
          <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4">
            <Youtube className="w-8 h-8" />
          </div>
          <h3 className="font-sans font-semibold text-slate-800 text-lg mb-1">
            Nenhum vídeo carregado
          </h3>
          <p className="font-sans text-sm text-slate-500 max-w-sm mb-6">
            Insira o link de um vídeo do YouTube acima para visualizar o vídeo, analisar os tempos e marcar o início e fim do seu corte.
          </p>
          <div className="flex flex-col gap-2.5 max-w-md text-left bg-white p-4 rounded-xl border border-slate-100 shadow-xs text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="font-mono font-bold text-slate-900 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Cole o link e navegue pelo player integrado de forma nativa.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono font-bold text-slate-900 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Marque com precisão os tempos de início e fim enquanto assiste ao vídeo.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-mono font-bold text-slate-900 bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Transfira os tempos marcados para o corte privado local no navegador.</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          id="yt-player-panel"
        >
          {/* Player Display (left column) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden shadow-md">
              <div id="youtube-player-container" className="absolute inset-0 w-full h-full" />
            </div>

            {/* Micro Controls & Live Timer */}
            <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-500">
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>Tempo Atual: <strong className="text-slate-700">{formatTime(currentTime, true)}</strong></span>
              </div>
              <div className="bg-slate-100 px-2.5 py-1.5 rounded-lg">
                <span>Duração Total: <strong className="text-slate-700">{formatTime(duration)}</strong></span>
              </div>
            </div>
          </div>

          {/* Time Picker & Mark Tools (right column) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl gap-5">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bookmark className="w-5 h-5 text-slate-700" />
                <h4 className="font-sans font-semibold text-slate-800 text-sm">
                  Marcador de Intervalo
                </h4>
              </div>

              {/* Action Markers */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  id="yt-set-start-btn"
                  onClick={handleSetStart}
                  className="flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 p-3 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Tempo Inicial</span>
                  <span className="font-mono text-sm font-semibold text-slate-900">
                    {formatTime(startTime)}
                  </span>
                  <span className="text-[11px] font-sans text-slate-500 flex items-center gap-1">
                    <Play className="w-3 h-3 text-slate-700 fill-slate-700" /> Marcar Agora
                  </span>
                </button>

                <button
                  id="yt-set-end-btn"
                  onClick={handleSetEnd}
                  className="flex flex-col items-center justify-center gap-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 p-3 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Tempo Final</span>
                  <span className="font-mono text-sm font-semibold text-slate-900">
                    {formatTime(endTime)}
                  </span>
                  <span className="text-[11px] font-sans text-slate-500 flex items-center gap-1">
                    <Pause className="w-3 h-3 text-red-500 fill-red-500" /> Marcar Agora
                  </span>
                </button>
              </div>

              {/* Manual adjust inputs */}
              <div className="flex flex-col gap-3 bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ajuste Fino de Segundos</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-sans text-slate-500 block mb-1">Início (s)</label>
                    <input
                      id="yt-input-start"
                      type="number"
                      step="0.5"
                      min="0"
                      max={endTime}
                      value={startTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setStartTime(Math.max(0, Math.min(val, endTime)));
                      }}
                      className="w-full font-mono text-xs px-2.5 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-sans text-slate-500 block mb-1">Fim (s)</label>
                    <input
                      id="yt-input-end"
                      type="number"
                      step="0.5"
                      min={startTime}
                      max={duration}
                      value={endTime}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEndTime(Math.max(startTime, Math.min(val, duration)));
                      }}
                      className="w-full font-mono text-xs px-2.5 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-slate-50/50"
                    />
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-sans text-slate-800 flex items-center justify-between">
                <span>Duração do Corte:</span>
                <strong className="font-mono text-sm text-slate-900">{formatTime(selectedDuration, true)}</strong>
              </div>
            </div>

            {/* Instructions Footer (YouTube restriction details) */}
            <div className="bg-amber-50/70 border border-amber-100/80 p-3.5 rounded-xl text-xs text-amber-900 leading-relaxed">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-amber-950">Políticas de Segurança do Navegador</span>
                  <p>
                    Para garantir <strong>privacidade absoluta e conformidade legal</strong>, os navegadores impedem a captura de streams do YouTube por restrições CORS.
                  </p>
                  <p className="font-medium">
                    Copie os tempos marcados acima, baixe o vídeo com sua ferramenta favorita, e jogue-o na aba <span className="underline">Cortador Local</span> para cortá-lo instantaneamente em segundos, sem upload externo!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
