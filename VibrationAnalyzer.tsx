import React, { useState, useRef, useEffect } from 'react';
import { Activity, Upload, AlertTriangle, CheckCircle, FileText, Loader2, Cpu, ClipboardList, Info, Settings, AlertOctagon, BellRing, ThumbsUp, ThumbsDown, ImageIcon, X, ImagePlus, Download, Factory, Disc, Compass, History, Layers, Eye, Zap, Wrench, ArrowRight } from 'lucide-react';
import { AnalysisResult, Severity } from '../types';
import { analyzeVibrationData } from '../services/geminiService';

type ImageType = 'waveform' | 'spectrum' | 'historical';

// New ISO Chart Component
const ISOChart: React.FC<{ severity: Severity }> = ({ severity }) => {
  const zones = [
    { name: 'A', label: 'Good', color: 'bg-green-500', severity: Severity.NORMAL },
    { name: 'B', label: 'Satisfactory', color: 'bg-blue-500', severity: Severity.PREWARNING },
    { name: 'C', label: 'Unsatisfactory', color: 'bg-yellow-500', severity: Severity.WARNING },
    { name: 'D', label: 'Unacceptable', color: 'bg-red-500', severity: Severity.ALARM },
  ];

  const activeZoneIndex = zones.findIndex(z => z.severity === severity);

  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold mb-3 text-slate-300">ISO 10816-3 Severity Assessment</h4>
      <div className="relative w-full mb-2">
        <div className="flex w-full h-6 rounded-md overflow-hidden shadow-inner bg-slate-900/50">
          {zones.map(zone => (
            <div key={zone.name} className={`flex-1 ${zone.color}`} />
          ))}
        </div>
        {activeZoneIndex !== -1 && (
          <div
            className="absolute top-full -translate-y-1 transition-all duration-500 ease-out"
            style={{ left: `${(activeZoneIndex * 25) + 12.5}%` }}
          >
            <div className="relative flex flex-col items-center">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-950 border border-slate-600 text-white whitespace-nowrap -mt-1">
                Current State
              </span>
              <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-slate-600 -mt-px" />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 px-1">
        {zones.map(zone => (
          <div key={zone.name} className="flex-1 text-center">
            <span className="font-bold">Zone {zone.name}</span>
            <span className="hidden sm:inline"> ({zone.label})</span>
          </div>
        ))}
      </div>
    </div>
  );
};


export const VibrationAnalyzer: React.FC = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Image States
  const [waveformImage, setWaveformImage] = useState<string | null>(null);
  const [spectrumImage, setSpectrumImage] = useState<string | null>(null);
  const [historicalImage, setHistoricalImage] = useState<string | null>(null);
  
  // View State
  const [activeView, setActiveView] = useState<'waveform' | 'spectrum' | 'compare'>('spectrum');
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  
  // Drag States
  const [dragActiveWaveform, setDragActiveWaveform] = useState(false);
  const [dragActiveSpectrum, setDragActiveSpectrum] = useState(false);
  const [dragActiveHistorical, setDragActiveHistorical] = useState(false);
  
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  
  // Metadata State
  const [equipmentName, setEquipmentName] = useState("");
  const [bearingId, setBearingId] = useState("");
  const [direction, setDirection] = useState("Horizontal");

  // Refs for hidden inputs & PDF generation
  const waveformInputRef = useRef<HTMLInputElement>(null);
  const spectrumInputRef = useRef<HTMLInputElement>(null);
  const historicalInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Bearing Frequencies State
  const [bearingParams, setBearingParams] = useState({
    bpfo: '',
    bpfi: '',
    bsf: ''
  });

  // Auto-switch view when images are uploaded
  useEffect(() => {
    if (historicalImage && spectrumImage) setActiveView('compare');
    else if (spectrumImage) setActiveView('spectrum');
    else if (waveformImage) setActiveView('waveform');
  }, [waveformImage, spectrumImage, historicalImage]);

  const processFile = (file: File, type: ImageType) => {
    if (!file || !file.type.startsWith('image/')) {
      alert("Please upload a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      const rawBase64 = base64.split(',')[1];
      if (type === 'waveform') setWaveformImage(rawBase64);
      else if (type === 'spectrum') setSpectrumImage(rawBase64);
      else setHistoricalImage(rawBase64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: ImageType) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0], type);
    }
  };

  // Drag Handlers
  const handleDrag = (e: React.DragEvent, type: ImageType, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'waveform') setDragActiveWaveform(active);
    else if (type === 'spectrum') setDragActiveSpectrum(active);
    else setDragActiveHistorical(active);
  };

  const handleDrop = (e: React.DragEvent, type: ImageType) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'waveform') setDragActiveWaveform(false);
    else if (type === 'spectrum') setDragActiveSpectrum(false);
    else setDragActiveHistorical(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], type);
    }
  };

  // Paste Handler
  const handlePaste = (e: React.ClipboardEvent, type: ImageType) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        if (blob) processFile(blob, type);
        e.preventDefault();
        break; // Only take the first image
      }
    }
  };

  const runAnalysis = async () => {
    if (!waveformImage && !spectrumImage) {
      alert("Please upload at least one image (Waveform or Spectrum).");
      return;
    }
    setAnalyzing(true);
    setFeedbackGiven(null); 
    try {
      const analysis = await analyzeVibrationData(
        waveformImage, 
        spectrumImage,
        bearingParams,
        {
          equipment: equipmentName,
          bearing: bearingId,
          direction: direction
        }
      );
      setResult(analysis);
    } catch (error) {
      console.error(error);
      alert("Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    setIsDownloading(true);

    const element = reportRef.current;
    const opt = {
      margin: [10, 10, 10, 10], // top, left, bottom, right
      filename: `VibroReport_${equipmentName || 'Unknown'}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Access html2pdf from window
    // @ts-ignore
    if (window.html2pdf) {
      // @ts-ignore
      window.html2pdf().set(opt).from(element).save().then(() => {
        setIsDownloading(false);
      });
    } else {
      alert("PDF library not loaded.");
      setIsDownloading(false);
    }
  };

  const handleFeedback = (isHelpful: boolean) => {
    setFeedbackGiven(isHelpful ? 'up' : 'down');
    const historyItem = {
      timestamp: new Date().toISOString(),
      severity: result?.severity,
      helpful: isHelpful
    };
    const existingHistory = JSON.parse(localStorage.getItem('gemini_feedback_history') || '[]');
    existingHistory.push(historyItem);
    localStorage.setItem('gemini_feedback_history', JSON.stringify(existingHistory));
  };

  const getSeverityData = (severity: Severity) => {
    switch (severity) {
      case Severity.ALARM: return { icon: <AlertOctagon size={32} />, color: 'text-red-500', zone: 'D' };
      case Severity.WARNING: return { icon: <AlertTriangle size={32} />, color: 'text-yellow-500', zone: 'C' };
      case Severity.PREWARNING: return { icon: <BellRing size={32} />, color: 'text-blue-500', zone: 'B' };
      case Severity.NORMAL: return { icon: <CheckCircle size={32} />, color: 'text-green-500', zone: 'A' };
      default: return { icon: <Activity size={32} />, color: 'text-white', zone: 'N/A' };
    }
  };


  // Helper to render structured text
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.trim().startsWith('###')) {
        return (
          <div key={index} className="mt-6 mb-3 pb-2 border-b border-slate-700 flex items-center gap-2">
            <Info size={18} className="text-blue-400" />
            <h4 className="text-lg font-bold text-blue-100 uppercase tracking-wide">
              {line.replace(/###/g, '').trim()}
            </h4>
          </div>
        );
      }
      if (line.trim().startsWith('-')) {
        const content = line.replace('-', '').trim();
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return (
          <li key={index} className="ml-4 mb-2 text-slate-300 list-none flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
            <span className="leading-relaxed">
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i} className="text-white font-semibold text-blue-200">{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
            </span>
          </li>
        );
      }
      if (line.trim().length > 0) {
         const parts = line.split(/(\*\*.*?\*\*)/g);
         return (
           <p key={index} className="mb-2 text-slate-400 leading-relaxed">
              {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
                }
                return part;
              })}
           </p>
         );
      }
      return null;
    });
  };

  // Reusable Drop Zone Component Logic
  const renderDropZone = (
    type: ImageType, 
    imageState: string | null, 
    setImageState: (val: string | null) => void,
    isDragActive: boolean,
    inputRef: React.RefObject<HTMLInputElement | null>,
    label: string,
    icon: React.ReactNode = <ImagePlus size={24} />
  ) => (
    <div className="mb-4">
      <label className="block text-sm text-slate-400 mb-2 font-medium">{label}</label>
      
      {!imageState ? (
        <div 
          className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer outline-none group
            ${isDragActive ? 'border-blue-400 bg-blue-500/10' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-700/30'}`}
          onDragEnter={(e) => handleDrag(e, type, true)}
          onDragLeave={(e) => handleDrag(e, type, false)}
          onDragOver={(e) => handleDrag(e, type, true)}
          onDrop={(e) => handleDrop(e, type)}
          onPaste={(e) => handlePaste(e, type)}
          onClick={() => inputRef.current?.click()}
          tabIndex={0}
        >
          <input 
            type="file" 
            ref={inputRef}
            className="hidden" 
            accept="image/*"
            onChange={(e) => handleFileSelect(e, type)}
          />
          
          <div className="bg-slate-800 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-blue-400">
            {icon}
          </div>
          <p className="text-xs text-slate-300 font-medium">Click / Drag & Drop</p>
        </div>
      ) : (
        <div className="relative group rounded-xl overflow-hidden border border-slate-600 bg-slate-900">
          <img 
            src={`data:image/png;base64,${imageState}`} 
            alt="Preview" 
            className="w-full h-24 object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button 
              onClick={() => setImageState(null)}
              className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors"
              title="Remove Image"
            >
              <X size={14} />
            </button>
            <button 
              onClick={() => inputRef.current?.click()} 
              className="p-1.5 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg transition-colors"
              title="Change Image"
            >
              <Upload size={14} />
            </button>
          </div>
          <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/70 text-[10px] text-white rounded backdrop-blur-sm pointer-events-none">
            {type === 'waveform' ? 'Waveform' : type === 'spectrum' ? 'Current' : 'History'}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-blue-400" /> Vibration Analyzer
          </h2>
          <p className="text-slate-400">Upload Time Waveform and Spectrum images for AI Analysis.</p>
        </div>
        <div className="flex gap-3">
          {result && (
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
                isDownloading ? 'bg-slate-600' : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-500'
              }`}
            >
              {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {isDownloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
          )}
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
              analyzing ? 'bg-slate-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
          >
            {analyzing ? <Loader2 className="animate-spin" /> : <Cpu />} 
            {analyzing ? 'Analyzing...' : 'Run Vibro AI'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-blue-200 flex items-center gap-2">
              <Factory size={18} /> Equipment Details
            </h3>
            
            <div className="space-y-3 mb-6">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Equipment Name</label>
                <div className="relative">
                  <Factory size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="e.g. Boiler Feed Pump A"
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-1/2">
                  <label className="text-xs text-slate-500 block mb-1">Bearing ID</label>
                  <div className="relative">
                    <Disc size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="e.g. Brg 3"
                      value={bearingId}
                      onChange={(e) => setBearingId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="w-1/2">
                   <label className="text-xs text-slate-500 block mb-1">Direction</label>
                   <div className="relative">
                    <Compass size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <select
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-blue-500 outline-none appearance-none"
                    >
                      <option value="Horizontal">Horizontal</option>
                      <option value="Vertical">Vertical</option>
                      <option value="Axial">Axial</option>
                    </select>
                   </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 my-4"></div>

            <h3 className="text-lg font-semibold mb-4 text-blue-200 flex items-center gap-2">
              <Upload size={18} /> Data Input
            </h3>
            
            {/* Waveform Input */}
            {renderDropZone(
              'waveform', 
              waveformImage, 
              setWaveformImage, 
              dragActiveWaveform, 
              waveformInputRef, 
              "Time Waveform"
            )}

            {/* Spectrum Input */}
            {renderDropZone(
              'spectrum', 
              spectrumImage, 
              setSpectrumImage, 
              dragActiveSpectrum, 
              spectrumInputRef, 
              "Current Spectrum FFT"
            )}

             {/* Historical Input */}
             {renderDropZone(
              'historical', 
              historicalImage, 
              setHistoricalImage, 
              dragActiveHistorical, 
              historicalInputRef, 
              "Historical Spectrum (Optional)",
              <History size={24} />
            )}

            {/* Bearing Defect Frequencies Input */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <h3 className="text-sm font-semibold mb-3 text-orange-200 flex items-center gap-2">
                <Settings size={14} /> Bearing Data (Hz/Orders)
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <label className="text-xs text-slate-500 block mb-1">BPFO (Outer)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 3.58"
                      value={bearingParams.bpfo}
                      onChange={(e) => setBearingParams({...bearingParams, bpfo: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="text-xs text-slate-500 block mb-1">BPFI (Inner)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 5.42"
                      value={bearingParams.bpfi}
                      onChange={(e) => setBearingParams({...bearingParams, bpfi: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-orange-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">BSF (Ball Spin)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2.15"
                    value={bearingParams.bsf}
                    onChange={(e) => setBearingParams({...bearingParams, bsf: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visualization (Images instead of Chart) */}
        <div className="lg:col-span-2 bg-slate-800 p-0 rounded-xl border border-slate-700 h-[600px] shadow-xl flex flex-col overflow-hidden">
          
          {/* Viz Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800">
            <button 
              onClick={() => setActiveView('waveform')}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeView === 'waveform' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              <Activity size={16} /> Waveform
            </button>
            <button 
               onClick={() => setActiveView('spectrum')}
               className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeView === 'spectrum' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50' : 'text-slate-400 hover:bg-slate-700'}`}
            >
              <Activity size={16} /> Spectrum
            </button>
            <button 
               onClick={() => setActiveView('compare')}
               disabled={!historicalImage || !spectrumImage}
               className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                 activeView === 'compare' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50' : 
                 (!historicalImage || !spectrumImage) ? 'text-slate-600 cursor-not-allowed' : 'text-slate-400 hover:bg-slate-700'
               }`}
            >
              <Layers size={16} /> Compare (Overlay)
            </button>
          </div>

          <div className="flex-1 bg-slate-900 flex items-center justify-center overflow-hidden relative">
            
            {/* WAVEFORM VIEW */}
            {activeView === 'waveform' && (
              waveformImage ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                   <img src={`data:image/png;base64,${waveformImage}`} alt="Waveform" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="text-slate-500 flex flex-col items-center">
                  <ImageIcon size={48} className="opacity-30 mb-2" />
                  <p>No Time Waveform Uploaded</p>
                </div>
              )
            )}

            {/* SPECTRUM VIEW */}
            {activeView === 'spectrum' && (
              spectrumImage ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                   <img src={`data:image/png;base64,${spectrumImage}`} alt="Spectrum" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="text-slate-500 flex flex-col items-center">
                  <ImageIcon size={48} className="opacity-30 mb-2" />
                  <p>No Spectrum Uploaded</p>
                </div>
              )
            )}

            {/* COMPARE VIEW */}
            {activeView === 'compare' && (
               <div className="relative w-full h-full flex items-center justify-center p-4 bg-black/20">
                 {/* Historical Layer (Bottom) */}
                 <div className="absolute inset-4 flex items-center justify-center">
                    <img 
                      src={`data:image/png;base64,${historicalImage}`} 
                      alt="Historical" 
                      className="max-w-full max-h-full object-contain opacity-50 sepia mix-blend-screen" 
                    />
                 </div>
                 
                 {/* Current Layer (Top) */}
                 <div className="absolute inset-4 flex items-center justify-center" style={{ opacity: overlayOpacity / 100 }}>
                    <img 
                      src={`data:image/png;base64,${spectrumImage}`} 
                      alt="Current" 
                      className="max-w-full max-h-full object-contain" 
                    />
                 </div>

                 {/* Legend */}
                 <div className="absolute top-4 left-4 flex flex-col gap-2 bg-black/60 p-2 rounded-lg text-xs backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-yellow-200 opacity-50 rounded-sm"></div>
                       <span className="text-slate-300">Historical (Background)</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-white rounded-sm"></div>
                       <span className="text-white">Current (Overlay)</span>
                    </div>
                 </div>

                 {/* Opacity Control */}
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800/90 p-4 rounded-xl border border-slate-600 flex flex-col items-center w-64 backdrop-blur-md shadow-2xl">
                    <div className="flex justify-between w-full text-[10px] text-slate-400 mb-1 uppercase tracking-wider font-bold">
                       <span>Historical</span>
                       <span>Current</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="mt-2 text-xs text-blue-300 font-mono">
                       Overlay: {overlayOpacity}%
                    </div>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Results - Wrapped for PDF */}
      {result && (
        <div ref={reportRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up bg-[#0f172a] p-4 rounded-xl">
          <div className="col-span-1 md:col-span-3 pb-4 border-b border-slate-700 mb-2">
             <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-xl font-bold text-white">Vibro Analysis Report</h3>
                  <p className="text-xs text-slate-400">Date: {new Date().toLocaleDateString()}</p>
               </div>
               <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 block">ID: {new Date().getTime().toString().slice(-8)}</span>
               </div>
             </div>
             
             {/* Equipment Context Header in Report */}
             <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 grid grid-cols-3 gap-4 text-sm">
                <div>
                   <span className="block text-slate-500 text-xs uppercase">Equipment</span>
                   <span className="font-bold text-blue-200">{equipmentName || '-'}</span>
                </div>
                <div>
                   <span className="block text-slate-500 text-xs uppercase">Bearing</span>
                   <span className="font-bold text-blue-200">{bearingId || '-'}</span>
                </div>
                <div>
                   <span className="block text-slate-500 text-xs uppercase">Direction</span>
                   <span className="font-bold text-blue-200">{direction}</span>
                </div>
             </div>
          </div>
          
          <div className="md:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-slate-300">Overall Health Assessment</h3>
              <div className={`text-3xl font-bold flex items-center gap-3 ${getSeverityData(result.severity).color}`}>
                {getSeverityData(result.severity).icon}
                {result.severity} (Zone {getSeverityData(result.severity).zone})
              </div>
            </div>
            <div className="mt-6">
              <ISOChart severity={result.severity} />
            </div>
          </div>
          
          <div className="md:col-span-1 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h3 className="text-lg font-semibold mb-3 text-slate-300">Identified Faults</h3>
            <div className="space-y-3">
              {result.faults.map((f, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3">
                  <Zap className="text-red-400 shrink-0 mt-0.5" size={18} />
                  <span className="text-slate-200 text-sm leading-relaxed font-medium">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h3 className="text-lg font-semibold mb-3 text-slate-300">Recommendations</h3>
            <div className="space-y-3">
              {result.recommendations.map((r, i) => (
                <div key={i} className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-start gap-3">
                  <Wrench className="text-green-400 shrink-0 mt-0.5" size={18} />
                  <span className="text-slate-200 text-sm leading-relaxed">{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 bg-gradient-to-b from-slate-800 to-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ClipboardList size={120} />
            </div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
              <div className="bg-blue-600/20 p-2 rounded-lg">
                <FileText className="text-blue-400" size={24} />
              </div>
              <h3 className="text-2xl font-bold text-white">Laporan Analisa Teknis AI</h3>
            </div>
            
            <div className="prose prose-invert max-w-none">
              {renderFormattedText(result.rawAnalysis)}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-700 text-xs text-slate-500 flex justify-between items-center" data-html2canvas-ignore="true">
              <span>Generated by Vibro Analysis Engine (Gemini 2.5 Flash)</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-slate-400">Analisa ini membantu?</span>
                    <button 
                      onClick={() => handleFeedback(true)}
                      disabled={feedbackGiven !== null}
                      className={`p-1.5 rounded-lg transition-all ${feedbackGiven === 'up' ? 'bg-green-500/20 text-green-400' : 'hover:bg-slate-700 text-slate-400'}`}
                    >
                      <ThumbsUp size={16} />
                    </button>
                    <button 
                      onClick={() => handleFeedback(false)}
                      disabled={feedbackGiven !== null}
                      className={`p-1.5 rounded-lg transition-all ${feedbackGiven === 'down' ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-700 text-slate-400'}`}
                    >
                      <ThumbsDown size={16} />
                    </button>
                </div>
                <span className="font-mono">REF: {new Date().toISOString().split('T')[0]}-CBM-LITE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};