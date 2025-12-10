import { getLiveClient } from '../services/geminiService';
import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Radio, Volume2, Activity } from 'lucide-react';
import { LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';
import { GEMINI_KNOWLEDGE_BASE } from '../utils/knowledgeBase';

export const LiveMaintenance: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  
  // Audio Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);

  // Visualizer Refs
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const render = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Styling
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.5; // Scale down height
        
        // Gradient Color based on amplitude
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#3b82f6'); // Blue
        gradient.addColorStop(1, '#06b6d4'); // Cyan

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const startSession = async () => {
    try {
      const client = getLiveClient();
      
      // Init Audio Contexts
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const outputNode = outputContextRef.current.createGain();
      outputNode.connect(outputContextRef.current.destination);

      // Connect to Gemini Live
      const sessionPromise = client.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setConnected(true);
            
            // Setup Input Stream & Visualizer
            if (!inputContextRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(stream);
            
            // Setup Analyser
            const analyser = inputContextRef.current.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                 session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            // Audio Graph: Source -> Analyser -> Processor -> Destination
            source.connect(analyser);
            analyser.connect(processor);
            processor.connect(inputContextRef.current.destination);
            
            sourceRef.current = source;
            processorRef.current = processor;

            // Start Visualization
            drawVisualizer();
          },
          onmessage: async (msg: LiveServerMessage) => {
            const serverContent = msg.serverContent;
            
            if (serverContent?.modelTurn?.parts?.[0]?.inlineData) {
              setIsTalking(true);
              const base64Audio = serverContent.modelTurn.parts[0].inlineData.data;
              
              if (outputContextRef.current) {
                 const ctx = outputContextRef.current;
                 const audioBytes = base64ToUint8Array(base64Audio);
                 const audioBuffer = await decodeAudioData(audioBytes, ctx);
                 
                 // Gapless playback logic
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                 
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputNode);
                 source.start(nextStartTimeRef.current);
                 
                 nextStartTimeRef.current += audioBuffer.duration;
                 
                 source.onended = () => {
                   if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
                     setIsTalking(false);
                   }
                 };
              }
            }

            if (serverContent?.interrupted) {
               setIsTalking(false);
               nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            setConnected(false);
            console.log("Session Closed");
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setConnected(false);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: GEMINI_KNOWLEDGE_BASE
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error("Failed to start live session", err);
      alert("Microphone access required for Live Monitor.");
    }
  };

  const stopSession = () => {
    // Cleanup Audio
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Close Session
    if (sessionRef.current) {
       sessionRef.current.then((s: any) => s.close && s.close());
    }
    
    setConnected(false);
    setIsTalking(false);
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-[500px] space-y-8 animate-fade-in w-full max-w-2xl mx-auto">
      <div className="text-center space-y-4 w-full flex flex-col items-center">
        
        <div className="relative w-full h-48 bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center overflow-hidden shadow-2xl">
          {connected ? (
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={192} 
              className="w-full h-full opacity-80"
            />
          ) : (
             <div className="flex flex-col items-center gap-3 text-slate-600">
               <Activity size={48} className="opacity-20" />
               <span className="text-sm font-mono tracking-widest uppercase">Signal Offline</span>
             </div>
          )}
          
          {/* Overlay Status */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className="text-xs font-mono text-slate-400">{connected ? 'LIVE FEED (16kHz)' : 'DISCONNECTED'}</span>
          </div>

          {/* AI Talk Indicator */}
          {isTalking && (
             <div className="absolute top-4 right-4 bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/50 flex items-center gap-2">
               <div className="flex gap-1">
                 <span className="w-1 h-3 bg-blue-400 animate-bounce"></span>
                 <span className="w-1 h-3 bg-blue-400 animate-bounce delay-75"></span>
                 <span className="w-1 h-3 bg-blue-400 animate-bounce delay-150"></span>
               </div>
               <span className="text-xs font-bold text-blue-300">AI SPEAKING</span>
             </div>
          )}
        </div>
        
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
             Live Voice Monitor
          </h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Real-time conversational diagnostics. Speak directly to the Vibro Analysis engine.
          </p>
        </div>
      </div>

      <button
        onClick={connected ? stopSession : startSession}
        className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 ${
          connected 
            ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 ring-4 ring-red-500/20' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-600/20'
        }`}
      >
        {connected ? <><MicOff /> Disconnect Link</> : <><Mic /> Initialize Voice Link</>}
      </button>

      {connected && (
        <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 px-4 py-2 rounded-lg border border-green-500/30">
          <Volume2 size={16} />
          <span>Bi-directional Audio Stream Active</span>
        </div>
      )}
    </div>
  );
};