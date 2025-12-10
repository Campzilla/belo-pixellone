export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PixelSettings {
  targetWidth: number;
  targetHeight: number;
  
  // Palette Logic
  paletteMode: 'auto' | 'preset';
  paletteSize: number; // Used only in 'auto' mode
  currentPalette: RGB[]; // The input palette settings
  currentPaletteName: string; // Display name

  blockSize: number; 
  contrast: number; 
  saturation: number; 
  smoothing: number; 
  dithering: number; 
  
  despeckleLevel: number; 
  lockAspectRatio: boolean;
  removeBackground: boolean;
  bgTolerance: number; 
  showGrid: boolean;
}

export interface ProcessResult {
  dataUrl: string;       // Visual representation for the <img> tag
  indices: Uint8Array;   // The raw pixel data (0-255 referencing the palette)
  palette: RGB[];        // The final palette actually used in the image
  width: number;
  height: number;
  transparentIndex: number; // -1 if no transparency, otherwise the index (usually 0)
}

export enum ProcessStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
}