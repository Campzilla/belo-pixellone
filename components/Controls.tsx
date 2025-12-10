
import React from 'react';
import { PixelSettings, RGB } from '../types';
import { extractPaletteFromImage } from '../lib/imageProcessor';
import { PRESET_PALETTES } from '../lib/palettes';
import { Sliders, Palette, Lock, Unlock, Download, RefreshCw, Trash2, Eraser, Sparkles, Wand2, Grid, BoxSelect, Upload, Pipette, Undo2, Redo2 } from 'lucide-react';
import { UI_TEXTS } from '../lib/translations';

interface ControlsProps {
  settings: PixelSettings;
  // Updated type to allow function updates or direct objects
  setSettings: (newSettings: PixelSettings | ((prev: PixelSettings) => PixelSettings)) => void;
  onProcess: () => void;
  onReset: () => void;
  hasImage: boolean;
  onDownload: () => void;
  originalDimensions: { w: number; h: number } | null;
  resultPalette?: RGB[];
  onPaletteColorChange?: (index: number, newColor: RGB) => void;
  transparentIndex?: number;
  lang: 'IT' | 'EN';
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const PRESET_SIZES = [16, 32, 64, 128, 256, 512, 1024];

const rgbToHex = (c: RGB) => {
    return "#" + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1);
};

const hexToRgb = (hex: string): RGB => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

export const Controls: React.FC<ControlsProps> = ({
  settings,
  setSettings,
  onProcess,
  onReset,
  hasImage,
  onDownload,
  originalDimensions,
  resultPalette,
  onPaletteColorChange,
  transparentIndex = -1,
  lang,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  
  const t = UI_TEXTS[lang];

  // Helper to use the new setSettings (which now handles history)
  const handleChange = (key: keyof PixelSettings, value: any) => {
    setSettings((prev) => ({
        ...prev,
        [key]: value
    }));
  };

  const handlePaletteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const extracted = await extractPaletteFromImage(file);
        if (extracted.length > 0) {
            setSettings((prev) => ({
                ...prev,
                paletteMode: 'preset',
                currentPalette: extracted,
                currentPaletteName: `Custom (${extracted.length})`
            }));
        }
    }
  };

  const isNative = originalDimensions && 
                   settings.targetWidth === originalDimensions.w && 
                   settings.targetHeight === originalDimensions.h;

  return (
    <div className="w-full md:w-80 bg-[#150a26] border-l-2 border-yellow-500 h-full flex flex-col shadow-2xl relative z-30">
      
      {/* --- FIXED HEADER SECTION --- */}
      <div className="p-6 pb-2 shrink-0 bg-[#150a26] z-10 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
            <Sliders className="text-yellow-400" size={20} />
            <h2 className="text-xl font-bold text-yellow-400 font-mono tracking-tighter">{t.headerTitle}</h2>
        </div>

        <button
          onClick={onProcess}
          disabled={!hasImage}
          className={`w-full py-3 rounded border-2 border-black font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all active:translate-y-1 active:shadow-none mb-2 ${
            hasImage 
              ? 'bg-green-500 text-black hover:bg-green-400' 
              : 'bg-[#1f1630] text-gray-500 cursor-not-allowed border-black/30'
          }`}
        >
          <RefreshCw size={18} strokeWidth={3} />
          {t.processBtn}
        </button>
        <div className="w-full h-[1px] bg-purple-900/50 mt-2"></div>
      </div>

      {/* --- SCROLLABLE SETTINGS SECTION --- */}
      <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-6 custom-scrollbar">
        
        {/* ACTIVE PALETTE SWAPPER (Only shows after processing) */}
        {resultPalette && resultPalette.length > 0 && (
            <div className="space-y-3 border-b-2 border-yellow-500/50 pb-5 bg-purple-900/10 p-2 rounded">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Pipette className="text-yellow-400" size={16} />
                        <label className="text-sm font-bold text-yellow-400 uppercase tracking-wide">{t.activePalette}</label>
                    </div>
                    <span className="text-[10px] text-purple-400 uppercase">{t.clickToSwap}</span>
                 </div>
                 
                 <div className="grid grid-cols-6 gap-1.5">
                    {resultPalette.map((color, idx) => {
                        if (idx === transparentIndex) return null; // Don't allow editing transparency placeholder here
                        return (
                            <label 
                                key={idx} 
                                className="w-8 h-8 rounded border border-white/20 cursor-pointer relative shadow hover:scale-110 transition-transform hover:border-white group"
                                style={{backgroundColor: `rgb(${color.r},${color.g},${color.b})`}}
                            >
                                <input 
                                    type="color" 
                                    className="opacity-0 w-full h-full cursor-pointer absolute inset-0"
                                    value={rgbToHex(color)}
                                    onChange={(e) => onPaletteColorChange && onPaletteColorChange(idx, hexToRgb(e.target.value))}
                                />
                            </label>
                        );
                    })}
                 </div>
                 <p className="text-[9px] text-purple-400 text-center italic">{t.swapNote}</p>
            </div>
        )}

        {/* Resolution */}
        <div className="space-y-3 border-b border-purple-900 pb-5">
            <label className="text-sm font-bold text-green-400 uppercase tracking-wide">{t.dimensions}</label>
            <div className="grid grid-cols-2 gap-3">
            <div>
                <span className="text-[10px] text-purple-400 mb-1 block uppercase">{t.width}</span>
                <input
                type="number"
                value={settings.targetWidth}
                onChange={(e) => handleChange('targetWidth', parseInt(e.target.value) || 1)}
                className="w-full bg-[#0a0510] text-white p-2 rounded border border-purple-700 focus:border-yellow-400 outline-none font-mono text-center"
                />
            </div>
            <div>
                <span className="text-[10px] text-purple-400 mb-1 block uppercase">{t.height}</span>
                <input
                type="number"
                value={settings.targetHeight}
                onChange={(e) => handleChange('targetHeight', parseInt(e.target.value) || 1)}
                className="w-full bg-[#0a0510] text-white p-2 rounded border border-purple-700 focus:border-yellow-400 outline-none font-mono text-center"
                />
            </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5 mt-2">
            {PRESET_SIZES.map(size => (
                <button
                    key={size}
                    onClick={() => {
                        setSettings((prev) => ({
                            ...prev,
                            targetWidth: size,
                            targetHeight: size
                        }));
                    }}
                    className={`px-2 py-1 text-[10px] border rounded transition-colors font-mono ${
                    settings.targetWidth === size && !isNative
                    ? 'bg-yellow-400 text-black border-yellow-400 font-bold' 
                    : 'bg-[#0a0510] border-purple-800 text-purple-300 hover:border-yellow-500 hover:text-white'
                    }`}
                >
                {size}
                </button>
            ))}
            <button
                onClick={() => {
                    if (originalDimensions) {
                        setSettings((prev) => ({
                            ...prev,
                            targetWidth: originalDimensions.w,
                            targetHeight: originalDimensions.h
                        }));
                    }
                }}
                disabled={!originalDimensions}
                className={`px-2 py-1 text-[10px] border rounded transition-colors font-mono flex items-center gap-1 ${
                    isNative
                    ? 'bg-green-500 text-black border-green-500 font-bold'
                    : !originalDimensions 
                    ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-[#0a0510] border-purple-800 text-green-400 hover:border-green-400 hover:text-white'
                }`}
            >
                {/* Fixed: Icon imported correctly now */}
                NATIVE
            </button>
            </div>
            
            <button 
                onClick={() => handleChange('lockAspectRatio', !settings.lockAspectRatio)}
                className={`flex items-center gap-2 text-xs mt-2 font-mono transition-colors ${settings.lockAspectRatio ? 'text-green-400' : 'text-red-400'}`}
            >
                {settings.lockAspectRatio ? <Lock size={12}/> : <Unlock size={12}/>}
                {t.lockRatio}: {settings.lockAspectRatio ? t.locked : t.unlocked}
            </button>

             {/* Pixel Size Slider */}
             <div className="pt-2">
                <span className="text-xs text-purple-200 mb-1 block flex justify-between">
                    <span className="flex items-center gap-1"><BoxSelect size={12}/> {t.pixelSize}</span>
                    <span className="text-yellow-400 font-bold">{settings.blockSize}x</span>
                </span>
                <input
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value={settings.blockSize}
                    onChange={(e) => handleChange('blockSize', parseInt(e.target.value))}
                    className="w-full h-2 bg-[#0a0510] rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
            </div>
        </div>

        {/* Normalization & Palette */}
        <div className="space-y-3 border-b border-purple-900 pb-5">
            <div className="flex items-center gap-2">
                <Palette className="text-green-400" size={16} />
                <label className="text-sm font-bold text-green-400 uppercase tracking-wide">{t.inputPalette}</label>
            </div>

            {/* PALETTE MODE SELECTOR */}
            <div className="flex bg-[#0a0510] p-1 rounded border border-purple-800 mb-3">
                <button 
                    onClick={() => handleChange('paletteMode', 'auto')}
                    className={`flex-1 text-[10px] py-1.5 rounded font-mono transition-colors ${settings.paletteMode === 'auto' ? 'bg-purple-600 text-white font-bold' : 'text-purple-400 hover:bg-purple-900'}`}
                >
                    AUTO (AI)
                </button>
                <button 
                    onClick={() => handleChange('paletteMode', 'preset')}
                    className={`flex-1 text-[10px] py-1.5 rounded font-mono transition-colors ${settings.paletteMode === 'preset' ? 'bg-purple-600 text-white font-bold' : 'text-purple-400 hover:bg-purple-900'}`}
                >
                    PRESET
                </button>
            </div>

            {/* AUTO MODE SETTINGS */}
            {settings.paletteMode === 'auto' && (
                <div>
                    <span className="text-xs text-purple-200 mb-1 block">{t.maxColors}: <span className="text-yellow-400 font-bold">{settings.paletteSize}</span></span>
                    <input
                        type="range"
                        min="2"
                        max="64"
                        step="1"
                        value={settings.paletteSize}
                        onChange={(e) => handleChange('paletteSize', parseInt(e.target.value))}
                        className="w-full h-2 bg-[#0a0510] rounded-lg appearance-none cursor-pointer accent-green-500"
                    />
                </div>
            )}

            {/* PRESET MODE SETTINGS */}
            {settings.paletteMode === 'preset' && (
                <div className="space-y-3">
                    <select 
                        value={settings.currentPaletteName}
                        onChange={(e) => {
                             const preset = PRESET_PALETTES.find(p => p.name === e.target.value);
                             if (preset) {
                                 setSettings(s => ({
                                     ...s,
                                     currentPalette: preset.colors,
                                     currentPaletteName: preset.name
                                 }));
                             }
                        }}
                        className="w-full bg-[#0a0510] text-white p-2 text-xs rounded border border-purple-700 focus:border-yellow-400 outline-none font-mono"
                    >
                        {PRESET_PALETTES.map(p => (
                            <option key={p.name} value={p.name}>{p.name} ({p.colors.length})</option>
                        ))}
                        {!PRESET_PALETTES.some(p => p.name === settings.currentPaletteName) && (
                            <option value={settings.currentPaletteName}>{settings.currentPaletteName}</option>
                        )}
                    </select>

                    <label className="flex items-center justify-center gap-2 w-full p-2 bg-[#0a0510] border border-dashed border-purple-600 rounded cursor-pointer hover:border-yellow-400 group transition-colors">
                        <Upload size={14} className="text-purple-400 group-hover:text-yellow-400"/>
                        <span className="text-[10px] uppercase font-bold text-purple-300 group-hover:text-yellow-400">{t.loadFromImg}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePaletteUpload}/>
                    </label>
                </div>
            )}
            
            {/* Smoothing */}
            <div className="pt-2">
            <span className="text-xs text-purple-200 mb-1 block flex justify-between">
                <span className="flex items-center gap-1"><Wand2 size={12}/> {t.preSmoothing}</span>
                <span className="text-yellow-400">{Math.round(settings.smoothing * 100)}%</span>
            </span>
            <input
                type="range"
                min="0"
                max="0.8"
                step="0.1"
                value={settings.smoothing}
                onChange={(e) => handleChange('smoothing', parseFloat(e.target.value))}
                className="w-full h-2 bg-[#0a0510] rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            </div>

            {/* Dithering */}
            <div className="pt-2">
            <span className="text-xs text-purple-200 mb-1 block flex justify-between">
                <span className="flex items-center gap-1"><Grid size={12}/> {t.dithering}</span>
                <span className="text-yellow-400">{Math.round(settings.dithering * 100)}%</span>
            </span>
            <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                value={settings.dithering}
                onChange={(e) => handleChange('dithering', parseFloat(e.target.value))}
                className="w-full h-2 bg-[#0a0510] rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
            </div>
        </div>

        {/* Finishing Touches */}
        <div className="space-y-4 border-b border-purple-900 pb-5">
            <label className="text-sm font-bold text-green-400 uppercase tracking-wide">{t.finishes}</label>
            
            {/* Despeckle */}
            <div>
            <span className="text-xs text-purple-200 mb-1 block flex justify-between items-center">
                <div className="flex items-center gap-1"><Sparkles size={12} className="text-cyan-400"/><span>{t.despeckle}</span></div>
                <span className="text-yellow-400">Lv {settings.despeckleLevel}</span>
            </span>
            <input
                type="range"
                min="0"
                max="3"
                step="1"
                value={settings.despeckleLevel}
                onChange={(e) => handleChange('despeckleLevel', parseInt(e.target.value))}
                className="w-full h-2 bg-[#0a0510] rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            </div>
        </div>

        {/* Color Grading */}
        <div className="space-y-4 border-b border-purple-900 pb-5">
            <label className="text-sm font-bold text-green-400 uppercase tracking-wide">{t.grading}</label>
            
            {/* Contrast */}
            <div>
            <span className="text-xs text-purple-200 mb-1 block flex justify-between">
                <span>{t.contrast}</span>
                <span className={settings.contrast === 0 ? "text-gray-400" : "text-yellow-400"}>
                    {settings.contrast > 0 ? "+" : ""}{Math.round(settings.contrast * 100)}%
                </span>
            </span>
            <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={settings.contrast}
                onChange={(e) => handleChange('contrast', parseFloat(e.target.value))}
                className="w-full h-2 bg-[#0a0510] rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
            </div>

            {/* Saturation */}
            <div>
            <span className="text-xs text-purple-200 mb-1 block flex justify-between">
                <span>{t.saturation}</span>
                <span className={settings.saturation === 0 ? "text-gray-400" : "text-yellow-400"}>
                    {settings.saturation > 0 ? "+" : ""}{Math.round(settings.saturation * 100)}%
                </span>
            </span>
            <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={settings.saturation}
                onChange={(e) => handleChange('saturation', parseFloat(e.target.value))}
                className="w-full h-2 bg-[#0a0510] rounded-lg appearance-none cursor-pointer accent-yellow-400"
            />
            </div>
        </div>

        {/* Background */}
        <div className="space-y-4 border-b border-purple-900 pb-5">
            <div className="flex items-center justify-between group">
                <div className="flex items-center gap-2">
                    <Eraser className="text-purple-400 group-hover:text-white transition-colors" size={16} />
                    <div className="flex flex-col">
                        <span className="text-sm text-purple-200 group-hover:text-white transition-colors cursor-pointer" onClick={() => handleChange('removeBackground', !settings.removeBackground)}>{t.removeBg}</span>
                        <span className="text-[9px] text-purple-500">{t.autoDetect}</span>
                    </div>
                </div>
                <input 
                    type="checkbox" 
                    checked={settings.removeBackground}
                    onChange={(e) => handleChange('removeBackground', e.target.checked)}
                    className="w-4 h-4 accent-green-500 rounded cursor-pointer"
                />
            </div>
        </div>
      </div>

      {/* --- FIXED FOOTER SECTION --- */}
      <div className="p-6 pt-4 border-t border-purple-900 bg-[#150a26] shrink-0 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
        <div className="flex gap-2">
            
            {/* UNDO / REDO GROUP */}
            <div className="flex gap-1 mr-2">
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`px-3 py-3 rounded border-2 font-bold text-sm flex items-center justify-center transition-all ${
                        canUndo 
                        ? 'bg-[#2a1d40] border-purple-600 text-yellow-400 hover:bg-[#362652] hover:border-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none' 
                        : 'bg-[#1f1630] border-gray-800 text-gray-700 cursor-not-allowed'
                    }`}
                    title="Undo"
                >
                    <Undo2 size={18} />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`px-3 py-3 rounded border-2 font-bold text-sm flex items-center justify-center transition-all ${
                        canRedo 
                        ? 'bg-[#2a1d40] border-purple-600 text-yellow-400 hover:bg-[#362652] hover:border-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none' 
                        : 'bg-[#1f1630] border-gray-800 text-gray-700 cursor-not-allowed'
                    }`}
                    title="Redo"
                >
                    <Redo2 size={18} />
                </button>
            </div>

            <button
            onClick={onDownload}
            disabled={!resultPalette} // Enable only when processing is done
            className={`flex-1 py-3 rounded border-2 border-black font-bold text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all active:translate-y-1 active:shadow-none ${
                resultPalette
                ? 'bg-yellow-400 text-black hover:bg-yellow-300' 
                : 'bg-[#1f1630] text-gray-500 cursor-not-allowed border-black/30'
            }`}
            >
            <Download size={18} strokeWidth={3} />
            {t.savePng}
            </button>
            
            <button
            onClick={onReset}
            className="px-3 py-3 rounded border-2 border-black bg-red-500 text-black hover:bg-red-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-colors"
            title="Reset"
            >
                <Trash2 size={18} strokeWidth={3} />
            </button>
        </div>
        {resultPalette && <div className="text-[9px] text-center text-purple-500 mt-2 font-mono">{t.formatNote}</div>}
      </div>
    </div>
  );
};
