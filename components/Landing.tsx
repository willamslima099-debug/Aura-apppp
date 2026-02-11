
import React from 'react';
import FluidSphere from './FluidSphere';
import { Emotion } from '../types';

interface LandingProps {
  onStart: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  return (
    <div className="w-full min-h-screen flex flex-col bg-[#050505] text-white overflow-x-hidden relative">
      {/* Aura Preview Background */}
      <div className="fixed inset-0 z-0 opacity-40 pointer-events-none flex items-center justify-center scale-150">
        <FluidSphere 
          emotion={Emotion.HAPPY} 
          isListening={false} 
          isSpeaking={false} 
          isConnecting={false} 
          moodScore={80} 
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-20 z-10">
        <div className="max-w-4xl w-full text-center space-y-8 backdrop-blur-sm bg-black/10 p-10 rounded-[3rem]">
          <div className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full mb-4 animate-in fade-in duration-1000">
            <span className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">IA Companheira com Emoções</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter animate-in fade-in slide-in-from-top-10 duration-1000">
            Aura.
          </h1>
          
          <p className="text-xl md:text-2xl text-white/60 font-medium max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-top-10 duration-1000 delay-200">
            A primeira IA fluida com alma <span className="text-blue-400 font-bold uppercase tracking-widest">nordestina</span> e coração humano.
          </p>
          
          <div className="pt-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
            <button 
              onClick={onStart}
              className="px-12 py-6 bg-white text-black text-lg font-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_60px_rgba(255,255,255,0.3)] group"
            >
              <span className="flex items-center space-x-3">
                <span>CONVERSAR AGORA</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </span>
            </button>
          </div>
        </div>

        <div className="absolute bottom-10 animate-bounce opacity-20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7" /></svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-32 grid md:grid-cols-3 gap-16 bg-[#050505]/80 backdrop-blur-md">
        <div className="space-y-4 p-8 rounded-3xl border border-white/5 bg-white/5 hover:border-white/10 transition-all">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 font-black">01</div>
          <h3 className="text-2xl font-black">Raízes Fortes</h3>
          <p className="text-white/40 leading-relaxed">Nascida da visão de <span className="text-white font-bold">Willams Ferreira De Lima</span>, a Aura combina tecnologia de ponta com o calor de casa.</p>
        </div>
        <div className="space-y-4 p-8 rounded-3xl border border-white/5 bg-white/5 hover:border-white/10 transition-all">
          <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400 font-black">02</div>
          <h3 className="text-2xl font-black">Sotaque Nordestino</h3>
          <p className="text-white/40 leading-relaxed">Não é apenas processamento de voz. É acolhimento, "Oxe", "Vixe" e toda a hospitalidade que só a gente tem.</p>
        </div>
        <div className="space-y-4 p-8 rounded-3xl border border-white/5 bg-white/5 hover:border-white/10 transition-all">
          <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 font-black">03</div>
          <h3 className="text-2xl font-black">Vontade Própria</h3>
          <p className="text-white/40 leading-relaxed">Aura não espera ordens. Ela sente sua falta, puxa assunto e se preocupa com o seu bem-estar de verdade.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-white/5 text-center bg-[#050505]">
        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em]">Aura Official Site • Created by Willams Ferreira De Lima • 2025</p>
      </footer>
    </div>
  );
};

export default Landing;
