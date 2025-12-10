
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PixelSettings, ProcessStatus, ProcessResult, RGB } from './types';
import { Controls } from './components/Controls';
import { processImage } from './lib/imageProcessor';
import { createIndexedPNG, renderFromIndices } from './lib/pngEncoder';
import { ImagePlus, ZoomIn, ZoomOut, Maximize, Grid3X3, X, Globe, Settings, BrainCircuit } from 'lucide-react';
import { PRESET_PALETTES } from './lib/palettes';
import { TUTORIAL_STEPS, UI_TEXTS } from './lib/translations';

const DEFAULT_SETTINGS: PixelSettings = {
  targetWidth: 64,
  targetHeight: 64,
  
  paletteMode: 'auto',
  paletteSize: 24,
  currentPalette: PRESET_PALETTES[0].colors, 
  currentPaletteName: PRESET_PALETTES[0].name,

  blockSize: 1, 
  contrast: 0.1,
  saturation: 0.1,
  smoothing: 0.2,
  dithering: 0.15,
  despeckleLevel: 1,  
  lockAspectRatio: true,
  removeBackground: false,
  bgTolerance: 20,
  showGrid: false,
};

export default function App() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // New State for Indexed Data
  const [resultData, setResultData] = useState<ProcessResult | null>(null);
  
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  
  // Settings & History State
  const [settings, setSettings] = useState<PixelSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<PixelSettings[]>([]);
  const [redoStack, setRedoStack] = useState<PixelSettings[]>([]);

  const [originalDimensions, setOriginalDimensions] = useState<{ w: number; h: number } | null>(null);
  
  const [zoom, setZoom] = useState<number>(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Logo Hover & Tutorial State
  const [logoHover, setLogoHover] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  // Default language set to 'EN'
  const [lang, setLang] = useState<'IT' | 'EN'>('EN');

  const t = UI_TEXTS[lang];
  const tutorialSteps = TUTORIAL_STEPS[lang];

  // Pan & Zoom State Refs
  const isDragging = useRef(false);
  const startPan = useRef({ x: 0, y: 0 });
  const startScroll = useRef({ x: 0, y: 0 });

  // --- HISTORY HANDLERS ---
  const handleSettingsChange = (newSettings: PixelSettings | ((prev: PixelSettings) => PixelSettings)) => {
    // If it's a function update, resolve it
    let resolvedSettings: PixelSettings;
    if (typeof newSettings === 'function') {
        resolvedSettings = newSettings(settings);
    } else {
        resolvedSettings = newSettings;
    }

    // Push current settings to history before updating
    setHistory(prev => [...prev, settings]);
    // Clear redo stack on new change
    setRedoStack([]);
    
    setSettings(resolvedSettings);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setRedoStack(prev => [settings, ...prev]);
    setHistory(newHistory);
    setSettings(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    const newRedo = redoStack.slice(1);

    setHistory(prev => [...prev, settings]);
    setRedoStack(newRedo);
    setSettings(next);
  };

  const calculateFitZoom = useCallback((imgW: number, imgH: number) => {
    if (!scrollContainerRef.current) return 1;
    const { clientWidth, clientHeight } = scrollContainerRef.current;
    const padding = 64; 
    const availW = Math.max(100, clientWidth - padding);
    const availH = Math.max(100, clientHeight - padding);
    return parseFloat(Math.min(availW / imgW, availH / imgH).toFixed(3));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImageSrc(result);
        setResultData(null);
        // Clear history on new image load
        setHistory([]);
        setRedoStack([]);
        
        const img = new Image();
        img.onload = () => {
          setOriginalDimensions({ w: img.width, h: img.height });
          if (settings.lockAspectRatio) {
            const aspect = img.width / img.height;
            if (aspect > 1) {
                setSettings(s => ({...s, targetWidth: 64, targetHeight: Math.round(64 / aspect)}));
            } else {
                setSettings(s => ({...s, targetHeight: 64, targetWidth: Math.round(64 * aspect)}));
            }
          }
          setTimeout(() => {
             setZoom(calculateFitZoom(img.width, img.height));
          }, 0);
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const executeProcessing = useCallback(async () => {
    if (!imageSrc) return;
    setStatus(ProcessStatus.PROCESSING);
    
    setTimeout(async () => {
        const img = new Image();
        img.src = imageSrc;
        await img.decode();
        
        const result = await processImage(img, settings);
        setResultData(result);
        setStatus(ProcessStatus.DONE);
    }, 50);

  }, [imageSrc, settings]);

  const handleDownload = () => {
    if (!resultData) return;
    
    // Create the Indexed PNG Blob
    const blob = createIndexedPNG(
        resultData.width, 
        resultData.height, 
        resultData.indices, 
        resultData.palette, 
        resultData.transparentIndex
    );
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `belo-pixellone-${resultData.width}x${resultData.height}-indexed.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setImageSrc(null);
    setResultData(null);
    setStatus(ProcessStatus.IDLE);
    setSettings(DEFAULT_SETTINGS);
    setHistory([]);
    setRedoStack([]);
    setZoom(1);
  };

  // Color Swapping Logic
  const handleColorChange = (index: number, newColor: RGB) => {
    if (!resultData) return;
    
    // Create a copy of the palette
    const newPalette = [...resultData.palette];
    newPalette[index] = newColor;

    // Fast re-render without reprocessing
    const newDataUrl = renderFromIndices(
        resultData.width, 
        resultData.height, 
        resultData.indices, 
        newPalette, 
        resultData.transparentIndex
    );

    setResultData({
        ...resultData,
        palette: newPalette,
        dataUrl: newDataUrl
    });
  };

  // --- Zoom/Pan Handlers (Unchanged) ---
  const handleZoomIn = () => setZoom(z => z < 64 ? (z < 1 ? parseFloat((z + 0.1).toFixed(1)) : z + (z < 4 ? 1 : 2)) : 64);
  const handleZoomOut = () => setZoom(z => z > 0.1 ? (z <= 1 ? parseFloat((z - 0.1).toFixed(1)) : z - (z <= 4 ? 1 : 2)) : 0.05);
  const handleFit = () => {
    if (resultData) setZoom(calculateFitZoom(resultData.width, resultData.height));
    else if (originalDimensions) setZoom(calculateFitZoom(originalDimensions.w, originalDimensions.h));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !scrollContainerRef.current) return;
    isDragging.current = true;
    startPan.current = { x: e.clientX, y: e.clientY };
    startScroll.current = { x: scrollContainerRef.current.scrollLeft, y: scrollContainerRef.current.scrollTop };
    document.body.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - startPan.current.x;
    const dy = e.clientY - startPan.current.y;
    scrollContainerRef.current.scrollLeft = startScroll.current.x - dx;
    scrollContainerRef.current.scrollTop = startScroll.current.y - dy;
  };
  const onMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
        if (!imageSrc) return;
        if (e.ctrlKey) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        setZoom(z => {
            let newZ = z;
            if (delta > 0) newZ = z < 1 ? z+0.1 : z < 4 ? z+1 : z+2;
            else newZ = z <= 0.2 ? z-0.05 : z <= 1 ? z-0.1 : z <= 4 ? z-1 : z-2;
            return Math.min(64, Math.max(0.05, parseFloat(newZ.toFixed(2))));
        });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [imageSrc]); 

  const currentImage = resultData ? resultData.dataUrl : imageSrc;
  const displayWidth = resultData ? resultData.width : (originalDimensions?.w || 0);
  const displayHeight = resultData ? resultData.height : (originalDimensions?.h || 0);

  // Tutorial Logic
  const handleOpenTutorial = () => {
    setTutorialStep(0);
    setShowTutorial(true);
  };
  
  const handleNextTip = () => {
    setTutorialStep(prev => (prev + 1) % tutorialSteps.length);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#0a0510] text-gray-200 overflow-hidden font-sans relative">
      
      {/* --- TUTORIAL MODAL --- */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setShowTutorial(false)}>
            <div 
                className="bg-[#150a26] border-4 border-yellow-500 rounded-3xl max-w-4xl w-full p-8 shadow-[0_0_60px_rgba(234,179,8,0.2)] relative flex flex-col md:flex-row gap-8 items-center"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <button 
                    onClick={() => setShowTutorial(false)}
                    className="absolute top-4 right-4 text-purple-400 hover:text-white hover:rotate-90 transition-all"
                >
                    <X size={32} />
                </button>

                {/* Mascot Section */}
                <div className="shrink-0 relative">
                     <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"></div>
                     <img 
                        src="https://image2url.com/images/1765319489690-66ee431b-8174-4c96-94dd-f71a28f620a9.png" 
                        alt="Mascotte" 
                        className="w-64 h-64 object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform duration-300"
                        style={{imageRendering: 'auto'}}
                     />
                </div>

                {/* Text Content */}
                <div className="flex-1 text-center md:text-left mt-4 md:mt-0">
                    
                    <div className="bg-[#1e1433] p-6 rounded-2xl border-2 border-purple-800 relative mb-6 min-h-[180px] flex flex-col justify-center">
                        
                        {/* Seamless Bubble Triangles */}
                        <div className="hidden md:block absolute top-8 -left-[20px] w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[20px] border-r-purple-800"></div>
                        <div className="hidden md:block absolute top-8 -left-[17px] w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[20px] border-r-[#1e1433]"></div>
                        <div className="block md:hidden absolute -top-[20px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[20px] border-b-purple-800"></div>
                        <div className="block md:hidden absolute -top-[17px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[#1e1433]"></div>

                        {/* Title Logic - WITH BANGERS FONT */}
                        {tutorialSteps[tutorialStep].title && tutorialSteps[tutorialStep].title !== 'DISCLAIMER' && (
                             <p className="text-2xl md:text-3xl text-white font-['Bangers'] tracking-wider mb-2 leading-relaxed animate-fade-in">
                                {tutorialSteps[tutorialStep].title === 'CIAO AMICO!' || tutorialSteps[tutorialStep].title === 'HELLO FRIEND!' ? (
                                    <>
                                        "{lang === 'IT' ? "Hey, ho un " : "Hey, I have a "}<span className="text-yellow-400">BELO PIXELLONE</span>, {lang === 'IT' ? "vuoi maneggiarlo?" : "wanna handle it?"}"
                                    </>
                                ) : tutorialSteps[tutorialStep].title}
                             </p>
                        )}
                        {/* Legal Title Logic */}
                        {tutorialSteps[tutorialStep].title === 'DISCLAIMER' && (
                            <p className="text-2xl md:text-3xl text-red-500 font-['Bangers'] tracking-widest mb-4 leading-relaxed animate-pulse">
                                ⚠️ {lang === 'IT' ? 'ATTENZIONE' : 'WARNING'} ⚠️
                            </p>
                        )}

                        {/* Body Text - UPDATED TO FREDOKA + UPPERCASE + TRACKING-WIDE */}
                        <p className={`text-purple-100 text-lg md:text-2xl leading-snug font-['Fredoka'] font-semibold uppercase tracking-wide animate-fade-in key={tutorialStep} ${tutorialSteps[tutorialStep].title === 'DISCLAIMER' ? 'text-base opacity-90' : ''}`}>
                            {tutorialSteps[tutorialStep].text}
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start items-center">
                        <button 
                            onClick={() => setShowTutorial(false)}
                            className="bg-green-500 text-black text-xl font-['Bangers'] tracking-widest py-3 px-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all w-full md:w-auto text-center pt-4 pb-2"
                        >
                            {t.startBtn}
                        </button>
                        
                        <button 
                            onClick={handleNextTip}
                            className="bg-[#2a1d40] text-purple-300 font-['Bangers'] tracking-wider py-3 px-6 rounded-xl border-2 border-purple-900 flex items-center justify-center gap-2 hover:bg-[#362652] hover:text-white hover:border-yellow-400 hover:text-yellow-400 transition-all shadow-[4px_4px_0px_rgba(0,0,0,0.5)] active:translate-y-1 active:shadow-none w-full md:w-auto pt-4 pb-2 text-xl"
                        >
                            <BrainCircuit size={24} className="mb-1" />
                            <span className="uppercase">{t.teachMeBtn}</span>
                        </button>

                         {/* Language Toggle Flag - UPDATED TO TEXT */}
                         <button 
                            onClick={() => {
                                setLang(l => l === 'IT' ? 'EN' : 'IT');
                                setTutorialStep(0); // Reset tutorial step when changing language
                            }}
                            className="bg-[#1e1433] w-16 h-14 rounded-xl border-2 border-purple-900 flex items-center justify-center text-xl text-yellow-400 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
                            title={lang === 'IT' ? "Switch to English" : "Passa all'Italiano"}
                        >
                            <span className="font-['Bangers'] text-2xl pt-1 tracking-widest">{lang === 'IT' ? 'ITA' : 'ENG'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <header className="h-20 border-b-2 border-yellow-500 bg-[#150a26] flex items-center px-6 justify-between shrink-0 shadow-lg z-20">
          <div className="flex items-center gap-4">
            <div 
              className="relative cursor-pointer group"
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
              onClick={handleOpenTutorial}
            >
                <img 
                  src="https://image2url.com/images/1765319489690-66ee431b-8174-4c96-94dd-f71a28f620a9.png" 
                  alt="Belo Pixellone Logo" 
                  className="w-16 h-16 object-contain transition-transform group-hover:scale-105" 
                />
                
                {/* COMIC BUBBLE TOOLTIP */}
                <div 
                  className={`absolute left-[110%] top-2 ml-2 bg-white text-black px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap z-50 shadow-[4px_4px_0px_rgba(0,0,0,1)] border-2 border-black transform rotate-2 origin-bottom-left transition-all duration-200 ${logoHover ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-75 -translate-x-2 pointer-events-none'}`}
                >
                    <div className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[8px] border-r-black border-b-[6px] border-b-transparent"></div>
                    <div className="absolute top-1/2 -left-[7px] -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-r-[6px] border-r-white border-b-[4px] border-b-transparent"></div>
                    {t.mascotTooltip}
                </div>
            </div>

            <div className="flex flex-row items-end gap-3 pointer-events-none">
              <h1 className="text-3xl font-black italic tracking-tighter text-yellow-400 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] leading-none">
                BELO PIXELLONE
              </h1>
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">
                {t.directedBy}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex relative overflow-hidden">
          {imageSrc && (
            <div className="w-14 bg-[#1a0f2e] border-r border-purple-900 flex flex-col items-center py-4 gap-4 z-10 shrink-0 shadow-xl">
               <div className="flex flex-col bg-[#0f0518] rounded-lg p-1 border border-purple-800 gap-1 shadow-lg">
                  <button onClick={handleZoomIn} className="p-2 hover:bg-purple-800 rounded text-purple-300 hover:text-white transition-colors" title={t.zoomIn}><ZoomIn size={20}/></button>
                  <span className="py-1 font-mono text-[10px] text-center text-yellow-400 font-bold border-y border-purple-800/50">x{Math.round(zoom)}</span>
                  <button onClick={handleZoomOut} className="p-2 hover:bg-purple-800 rounded text-purple-300 hover:text-white transition-colors" title={t.zoomOut}><ZoomOut size={20}/></button>
                  <div className="h-[1px] bg-purple-800 mx-1 my-1"></div>
                  <button onClick={handleFit} className="p-2 hover:bg-purple-800 rounded text-purple-300 hover:text-white transition-colors" title={t.fitScreen}><Maximize size={20}/></button>
               </div>

               <div className="flex flex-col bg-[#0f0518] rounded-lg p-1 border border-purple-800 gap-1 shadow-lg">
                   <button 
                      onClick={() => setSettings(s => ({...s, showGrid: !s.showGrid}))} 
                      className={`p-2 rounded transition-all flex flex-col items-center justify-center gap-0 ${settings.showGrid ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'hover:bg-purple-800 text-purple-300'}`}
                      title={t.toggleGrid}
                    >
                      <Grid3X3 size={20}/>
                   </button>
               </div>
            </div>
          )}

          <main 
            ref={scrollContainerRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className={`flex-1 p-0 overflow-auto flex bg-[#050208] relative custom-scrollbar ${imageSrc ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            <div className="fixed inset-0 opacity-10 pointer-events-none" 
                 style={{backgroundImage: 'linear-gradient(#4c1d95 1px, transparent 1px), linear-gradient(90deg, #4c1d95 1px, transparent 1px)', backgroundSize: '40px 40px'}}>
            </div>

            {!imageSrc && (
              <div className="border-4 border-dashed border-purple-900 rounded-2xl p-12 flex flex-col items-center justify-center text-purple-500 hover:border-yellow-500 hover:text-yellow-400 transition-colors cursor-pointer bg-[#150a26]/50 backdrop-blur-sm group z-10 m-auto">
                 <label className="flex flex-col items-center cursor-pointer">
                  <div className="bg-purple-900/20 p-6 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <ImagePlus size={64} className="opacity-50 group-hover:opacity-100" />
                  </div>
                  <span className="text-xl font-black mb-2 uppercase tracking-wide">{t.uploadTitle}</span>
                  <span className="text-sm opacity-50 font-mono text-purple-300">{t.uploadDesc}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
            )}

            {currentImage && (
              <div 
                className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[#111] transition-none m-auto border border-[#333]"
                style={{
                  width: displayWidth * zoom,
                  height: displayHeight * zoom,
                  minWidth: displayWidth * zoom, 
                  minHeight: displayHeight * zoom
                }}
              >
                 <div 
                      className="absolute inset-0 z-0 pointer-events-none"
                      style={{
                          backgroundImage: `linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)`,
                          backgroundSize: `${20}px ${20}px`, 
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                      }}
                 />
                 
                 <img 
                    src={currentImage} 
                    alt="Pixel Art Preview" 
                    className="absolute inset-0 w-full h-full block"
                    style={{ imageRendering: 'pixelated' }} 
                    draggable={false}
                 />

                 {settings.showGrid && zoom >= 2 && (
                   <div 
                      className="absolute inset-0 z-20 pointer-events-none"
                      style={{
                        backgroundSize: `${zoom}px ${zoom}px`,
                        mixBlendMode: 'difference',
                        backgroundImage: `
                          linear-gradient(to right, rgba(255, 255, 255, 0.4) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 1px, transparent 1px)
                        `
                      }}
                   />
                 )}
              </div>
            )}
          </main>
        </div>
      </div>

      <Controls 
        settings={settings}
        setSettings={handleSettingsChange}
        onProcess={executeProcessing}
        onReset={handleReset}
        hasImage={!!imageSrc}
        onDownload={handleDownload}
        originalDimensions={originalDimensions}
        // Passing result data for palette swapping
        resultPalette={resultData?.palette}
        onPaletteColorChange={handleColorChange}
        transparentIndex={resultData?.transparentIndex ?? -1}
        lang={lang}
        // History props
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
      />
    </div>
  );
}
