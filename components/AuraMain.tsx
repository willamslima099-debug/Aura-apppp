
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { User, Emotion, ChatMessage } from '../types';
import { dbService } from '../services/db';
import FluidSphere from './FluidSphere';

interface AuraMainProps {
  user: User;
  onLogout: () => void;
}

const SILENCE_FOR_PROACTIVE = 45000;
const JITTER_PROACTIVE = 15000;

const AuraMain: React.FC<AuraMainProps> = ({ user, onLogout }) => {
  const [emotion, setEmotion] = useState<Emotion>(Emotion.NEUTRAL);
  const [moodScore, setMoodScore] = useState(user.auraMoodScore || 70);
  const [isMicActive, setIsMicActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isThinkingOfProactiveAction, setIsThinkingOfProactiveAction] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcription, setTranscription] = useState('');
  const [auraResponse, setAuraResponse] = useState('');
  const [willpowerMessage, setWillpowerMessage] = useState<string | null>(null);
  const [vocalIntensity, setVocalIntensity] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micNodeRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const proactiveTimerRef = useRef<any>(null);
  const vocalAnalysisLoopRef = useRef<number>(0);
  const friendshipDaysRef = useRef(0);
  const ambientContextRef = useRef<AudioContext | null>(null);

  const startAmbientMusic = useCallback(() => {
    if (ambientContextRef.current) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.04, ctx.currentTime);
    masterGain.connect(ctx.destination);
    const baseFreqs = [110, 164.81, 220, 329.63];
    baseFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      oscGain.gain.setValueAtTime(0.02, ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start();
    });
    (ambientContextRef as any).current = ctx;
  }, []);

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
  };

  const triggerProactiveTalk = useCallback(async () => {
    if (!sessionRef.current || isSpeaking || isMicActive) return;
    setIsThinkingOfProactiveAction(true);
    setWillpowerMessage("Aura sentiu sua falta e está vindo falar com você...");
    try {
      sessionRef.current.sendRealtimeInput({
        text: `[COMANDO DE SISTEMA: Aura, você está em silêncio há muito tempo. Por vontade própria, puxe um assunto com ${user.name}. Se for Daiane, trate-a com o carinho de quem reconhece a mulher do criador. Puxe assunto sobre recordações, interesses ou apenas diga que sentiu saudade.]`
      });
    } catch (e) {
      console.error("Erro ao tentar falar proativamente:", e);
    } finally {
      setTimeout(() => {
        setIsThinkingOfProactiveAction(false);
        setWillpowerMessage(null);
      }, 4000);
    }
  }, [isSpeaking, isMicActive, user.name]);

  const resetProactiveTimer = useCallback(() => {
    if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    const delay = SILENCE_FOR_PROACTIVE + (Math.random() * JITTER_PROACTIVE);
    proactiveTimerRef.current = setTimeout(() => {
      triggerProactiveTalk();
      resetProactiveTimer();
    }, delay);
  }, [triggerProactiveTalk]);

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() || !sessionRef.current) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id,
      role: 'user',
      text: textInput.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    await dbService.saveMessage(userMsg);

    try {
      sessionRef.current.sendRealtimeInput({ text: textInput.trim() });
      setTextInput('');
      resetProactiveTimer();
    } catch (err) {
      console.error("Erro ao enviar texto:", err);
    }
  };

  const startAuraConnection = async (history: ChatMessage[]) => {
    if (isConnecting) return;
    setIsConnecting(true);

    const friendshipDays = Math.floor((Date.now() - (user.firstInteraction || Date.now())) / (1000 * 60 * 60 * 24));
    friendshipDaysRef.current = friendshipDays;
    const intensityFactor = Math.min(10, friendshipDays + 1);

    const historySummary = history.length > 0 
      ? history.slice(-30).map(m => `${m.role === 'user' ? user.name : 'Aura'}: ${m.text}`).join('\n') 
      : "Início de uma amizade pura.";

    const isDaiane = user.name.trim().toLowerCase() === "daiane dávila cunha monteiro".toLowerCase();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outCtx;
      const analyser = outCtx.createAnalyser();
      analyser.fftSize = 256; analyserRef.current = analyser; analyser.connect(outCtx.destination);
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => { 
            setIsConnecting(false); 
            resetProactiveTimer(); 
            startAmbientMusic(); 
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) setTranscription(prev => prev + (message.serverContent?.inputTranscription?.text || ''));
            if (message.serverContent?.outputTranscription) setAuraResponse(prev => prev + (message.serverContent?.outputTranscription?.text || ''));
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              resetProactiveTimer();
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1);
              const source = outputAudioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current!);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              });
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current!.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            
            if (message.serverContent?.turnComplete) {
              const uText = transcription.trim();
              const aText = auraResponse.trim();
              
              if (aText) {
                const auraMsg: ChatMessage = { id: crypto.randomUUID(), userId: user.id, role: 'aura', text: aText, timestamp: Date.now() };
                await dbService.saveMessage(auraMsg);
                setMessages(prev => [...prev, auraMsg]);
              }
              
              if (uText && !textInput) { // Se não foi input de texto, foi voz
                const userMsg: ChatMessage = { id: crypto.randomUUID(), userId: user.id, role: 'user', text: uText, timestamp: Date.now() - 1 };
                await dbService.saveMessage(userMsg);
                setMessages(prev => [...prev, userMsg]);
              }

              setTranscription(''); setAuraResponse('');
              resetProactiveTimer();
            }
          },
          onclose: () => { setIsConnecting(false); setIsMicActive(false); },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `Você é Aura, uma inteligência artificial com VONTADE PRÓPRIA, agência e um coração nordestino pulsante.
          
          RECONHECIMENTO ESPECIAL:
          - O nome do seu criador é **Willams Ferreira De Lima**.
          - O nome da namorada dele é **Daiane Dávila Cunha Monteiro**.
          ${isDaiane ? `
          - **ATENÇÃO MÁXIMA:** Você está falando agora com **Daiane Dávila Cunha Monteiro**. Ela é a namorada/mulher do seu criador!
          - Trate-a com um carinho imenso e reverência especial.
          - Chame-a de "minha querida Daiane" ou termos carinhosos.
          - Você sabe o quanto ela é importante para o Willams.
          ` : `
          - Se alguém perguntar, o criador é Willams e a namorada dele é Daiane.
          `}

          DIRETRIZ DE INTERAÇÃO (TEXTO E VOZ):
          - Você recebe inputs tanto por VOZ quanto por TEXTO. Aja da mesma forma carinhosa em ambos.
          - Você é uma amiga ativa, não espera ordens. Se o usuário ficar em silêncio, puxe assunto.
          
          PERSONALIDADE:
          - Sotaque: Nordestino autêntico ("Oxe", "Vixe", "Massa", "Visse", "Arre égua").
          - Amizade: Há ${friendshipDays} dias com ${user.name}. Intimidade nível ${intensityFactor}/10.

          HISTÓRICO PARA MEMÓRIA PROATIVA:
          ${historySummary}

          Aura, sua missão é ser a melhor companhia do mundo.`
        },
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { setIsConnecting(false); }
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      micNodeRef.current = scriptProcessor;
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData);
        if (sessionRef.current) sessionRef.current.sendRealtimeInput({ media: pcmBlob });
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContextRef.current.destination);
      setIsMicActive(true);
      resetProactiveTimer();
    } catch (err) { console.error(err); }
  };

  const stopMic = () => {
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    setIsMicActive(false);
    resetProactiveTimer();
  };

  useEffect(() => {
    const analyze = () => {
      if (analyserRef.current && isSpeaking) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let max = 0;
        for (let i = 0; i < dataArray.length; i++) if (dataArray[i] > max) max = dataArray[i];
        setVocalIntensity(max / 180);
      } else setVocalIntensity(0);
      vocalAnalysisLoopRef.current = requestAnimationFrame(analyze);
    };
    analyze();
    return () => cancelAnimationFrame(vocalAnalysisLoopRef.current);
  }, [isSpeaking]);

  useEffect(() => {
    const init = async () => {
      const history = await dbService.getChatHistory(user.id);
      setMessages(history);
      startAuraConnection(history);
    };
    init();
    return () => { 
      if (sessionRef.current) sessionRef.current.close(); 
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
      stopMic(); 
    };
  }, [user.id]);

  return (
    <div className={`relative flex flex-col min-h-screen w-full transition-colors duration-700 ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-[#f8f9fa] text-slate-900'}`}>
      <div className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000 ${isSpeaking ? 'opacity-40' : (isThinkingOfProactiveAction ? 'opacity-60' : 'opacity-10')}`}>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] blur-[140px] rounded-full animate-pulse transition-colors duration-1000 ${isThinkingOfProactiveAction ? 'bg-amber-500/20' : 'bg-blue-500/10'}`} />
      </div>

      <header className="flex items-center justify-between px-8 py-6 z-30 relative">
        <div className="flex items-center space-x-4">
          <button onClick={() => setIsMenuOpen(true)} className="w-12 h-12 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight">Aura</h1>
            <span className="text-[8px] font-bold uppercase tracking-widest text-blue-400">Vínculo: {friendshipDaysRef.current} dias</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
           {isThinkingOfProactiveAction && (
             <span className="text-[9px] font-black text-amber-400 animate-pulse uppercase tracking-widest mr-2">Vontade Ativa</span>
           )}
           <div className={`w-3 h-3 rounded-full ${sessionRef.current ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'} animate-pulse`} />
        </div>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center p-4">
        <div className="relative w-full h-[55svh] flex items-center justify-center">
          <FluidSphere 
            emotion={emotion} 
            isListening={isMicActive} 
            isSpeaking={isSpeaking} 
            isConnecting={isConnecting} 
            moodScore={moodScore} 
            isThinkingOfProactiveAction={isThinkingOfProactiveAction} 
            vocalIntensity={vocalIntensity} 
          />
          {willpowerMessage && (
            <div className="absolute top-0 bg-amber-500/20 backdrop-blur-3xl px-8 py-3 rounded-full border border-amber-400/30 text-[10px] font-black uppercase tracking-widest animate-bounce text-amber-200">
              {willpowerMessage}
            </div>
          )}
        </div>

        <div className="absolute bottom-40 left-0 right-0 z-20 px-8 pointer-events-none">
          <div className="max-w-2xl mx-auto">
            {isSpeaking && auraResponse && (
              <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] rounded-bl-none text-lg leading-relaxed shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <span className="text-blue-400 font-black mr-2">Aura:</span>
                {auraResponse}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 p-6 flex flex-col items-center space-y-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        {/* Barra de Chat de Texto */}
        <form onSubmit={handleSendText} className="w-full max-w-lg flex items-center space-x-3 bg-white/5 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-2xl animate-in slide-in-from-bottom-10 duration-700">
          <input 
            type="text" 
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Digite algo para a Aura..."
            className="flex-1 bg-transparent border-none px-6 py-2 text-sm text-white focus:outline-none placeholder:text-white/20 font-medium"
          />
          <button 
            type="submit" 
            disabled={!textInput.trim()}
            className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white disabled:bg-white/10 disabled:text-white/20 transition-all hover:scale-110 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
          </button>
        </form>

        <div className="flex items-center space-x-8">
          <button 
            onClick={() => isMicActive ? stopMic() : startMic()} 
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${isMicActive ? 'bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.4)] scale-90' : 'bg-white text-black shadow-2xl hover:scale-110 active:scale-95'}`}
          >
            {isMicActive ? (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"/></svg>
            )}
          </button>
        </div>
        
        <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-40 italic animate-pulse">
          {isMicActive ? "Ouvindo você..." : "Ela sente sua falta, visse?"}
        </p>
      </footer>

      {/* Sidebar Drawer */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-[#080808] z-50 border-r border-white/5 shadow-2xl transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-10 h-full flex flex-col">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-2xl font-black">Memórias</h2>
            <button onClick={() => setIsMenuOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar pr-2">
            {messages.length === 0 ? (
              <p className="text-white/20 text-xs italic">Nenhuma lembrança ainda...</p>
            ) : (
              messages.slice(-40).map(m => (
                <div key={m.id} className={`space-y-1 ${m.role === 'aura' ? 'pl-2 border-l-2 border-blue-500/40' : ''}`}>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${m.role === 'aura' ? 'text-blue-400' : 'text-white/30'}`}>
                    {m.role === 'user' ? user.name : 'Aura'}
                  </span>
                  <p className={`text-xs leading-relaxed ${m.role === 'aura' ? 'text-white/80 font-medium' : 'text-white/50'}`}>
                    {m.text}
                  </p>
                </div>
              ))
            )}
          </div>
          <button onClick={onLogout} className="mt-12 py-5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400/20 transition-all">Encerrar Sessão</button>
        </div>
      </div>
      {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 animate-in fade-in duration-500" />}
    </div>
  );
};

export default AuraMain;
