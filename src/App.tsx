/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Scissors, Youtube, ShieldAlert, Heart, Calendar, Github, Check, 
  Sparkles, ShieldCheck, PlaySquare, Video, FileText, ArrowRight
} from 'lucide-react';
import LocalCutter from './components/LocalCutter';
import YouTubeTool from './components/YouTubeTool';
import { VideoSource } from './types';
import { formatTime } from './utils';
import { motion } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<VideoSource>('local');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  // Sync timestamps from YouTube tool to local trimmer or vice-versa
  const handleTimesChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800 antialiased" id="app-root">
      
      {/* Header Area */}
      <header className="bg-white border-b border-slate-200/60 py-5 px-6 sticky top-0 z-40" id="main-header">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Scissors className="w-5 h-5 -rotate-90" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-sans font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1">
                LocalCut<span className="text-blue-600 font-extrabold">.</span>
              </h1>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono">
                100% Local • Sem Servidores
              </span>
            </div>
          </div>

          {/* Privacy badge */}
          <div className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-100 rounded-full px-4 py-2 text-xs font-semibold tracking-wide" id="header-privacy-badge">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Local Core Active</span>
          </div>
          
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 flex flex-col gap-8" id="main-content">
        
        {/* Intro Alert: Privacy & Local Execution */}
        <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden border border-slate-800" id="intro-card">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2 max-w-2xl">
              <span className="text-[9px] font-mono font-bold tracking-widest bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full uppercase w-max text-blue-400">
                Segurança Máxima
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                Corte vídeos com facilidade, velocidade e privacidade total.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                Diferente de outros sites, todo o processamento de áudio e vídeo é feito diretamente no seu navegador. Seu arquivo de vídeo nunca é transmitido pela internet, economizando dados e garantindo sigilo absoluto.
              </p>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-800 text-xs flex flex-col gap-2 min-w-[200px] shrink-0">
              <span className="font-bold uppercase tracking-widest text-slate-400 text-[10px] block">Prós do Processamento Local</span>
              <div className="flex items-center gap-1.5 text-slate-200">
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span>Sem limite de tamanho</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-200">
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span>Sem upload de arquivos</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-200">
                <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span>Processamento no browser</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Selector & Workspace Wrapper */}
        <section className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-xs flex flex-col gap-6" id="workspace-card">
          
          {/* Tab Navigation header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Estúdio de Edição
              </h3>
              <p className="text-xs text-slate-500">
                Escolha o método desejado para iniciar seu corte.
              </p>
            </div>

            {/* Custom high-fidelity pill tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-center" id="tab-pill-box">
              <button
                id="tab-btn-local"
                onClick={() => setActiveTab('local')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'local'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                Cortador Local
              </button>
              <button
                id="tab-btn-youtube"
                onClick={() => setActiveTab('youtube')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'youtube'
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                Marcador do YouTube
              </button>
            </div>
          </div>

          {/* Dynamic Tab Body */}
          <div className="min-h-[250px]" id="tab-content-area">
            {activeTab === 'local' ? (
              <LocalCutter
                initialStartTime={startTime}
                initialEndTime={endTime}
                onTimesChange={handleTimesChange}
              />
            ) : (
              <YouTubeTool
                initialStartTime={startTime}
                initialEndTime={endTime}
                onSelectTimes={handleTimesChange}
              />
            )}
          </div>

        </section>

        {/* Global state tracker details / Sync Alert when times are captured */}
        {endTime > startTime && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-100/80 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-700"
            id="sync-alert-bar"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-slate-200 text-slate-700 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="font-sans text-slate-600">
                Intervalo selecionado atualmente:{' '}
                <strong className="font-mono text-slate-950 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  {formatTime(startTime, true)}
                </strong>{' '}
                até{' '}
                <strong className="font-mono text-slate-950 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  {formatTime(endTime, true)}
                </strong>{' '}
                (Duração: <span className="font-bold text-slate-900">{formatTime(endTime - startTime, true)}</span>).
              </p>
            </div>
            
            {activeTab === 'youtube' && (
              <button
                id="goto-local-cut-btn"
                onClick={() => setActiveTab('local')}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold font-sans px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-[11px]"
              >
                Ir para o Cortador Local <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}

      </main>

      {/* Footer Area */}
      <footer className="bg-white border-t border-slate-200/60 py-6 px-6 text-center text-xs text-slate-400" id="main-footer">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-sans flex items-center gap-1 justify-center text-slate-500">
            Feito localmente com <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> • Segurança e Privacidade Garantidas.
          </p>
          <div className="flex items-center gap-4 font-mono text-slate-400">
            <span>Privacidade: <strong className="text-green-600 font-sans font-medium">Totalmente Offline</strong></span>
            <span>Estúdio: <strong className="text-slate-600 font-medium">v1.0.0</strong></span>
          </div>
        </div>
      </footer>

    </div>
  );
}

