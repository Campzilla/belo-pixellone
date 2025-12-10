import { RGB } from '../types';

// Helper to convert Hex to RGB
const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

export interface PresetPalette {
  name: string;
  colors: RGB[];
}

export const PRESET_PALETTES: PresetPalette[] = [
  // --- CLASSIC CONSOLES & COMPUTERS ---
  {
    name: "GameBoy (Original)",
    colors: ["#9bbc0f", "#8bac0f", "#306230", "#0f380f"].map(hexToRgb)
  },
  {
    name: "GameBoy (Pocket B&W)",
    colors: ["#FFFFFF", "#AAAAAA", "#555555", "#000000"].map(hexToRgb)
  },
  {
    name: "NES (NTSC)",
    colors: [
      "#7C7C7C", "#0000FC", "#0000BC", "#4428BC", "#940084", "#A80020", "#A81000", "#881400",
      "#503000", "#007800", "#006800", "#005800", "#004058", "#000000", "#000000", "#000000",
      "#BCBCBC", "#0078F8", "#0058F8", "#6844FC", "#D800CC", "#E40058", "#F83800", "#E45C10",
      "#AC7C00", "#00B800", "#00A800", "#00A844", "#008888", "#000000", "#000000", "#000000",
      "#F8F8F8", "#3CBCFC", "#6888FC", "#9878F8", "#F878F8", "#F85898", "#F87858", "#FCA044",
      "#F8B800", "#B8F818", "#58D854", "#58F898", "#00E8D8", "#787878", "#000000", "#000000",
      "#FCFCFC", "#A4E4FC", "#B8B8F8", "#D8B8F8", "#F8B8F8", "#F8A4C0", "#F0D0B0", "#FCE0A8",
      "#F8D878", "#D8F878", "#B8F8B8", "#B8F8D8", "#00FCFC", "#F8D8F8", "#000000", "#000000"
    ].map(hexToRgb)
  },
  {
    name: "Commodore 64",
    colors: [
      "#000000", "#FFFFFF", "#880000", "#AAFFEE", "#CC44CC", "#00CC55", "#0000AA", "#EEEE77",
      "#DD8855", "#664400", "#FF7777", "#333333", "#777777", "#AAFF66", "#0088FF", "#BBBBBB"
    ].map(hexToRgb)
  },
  {
    name: "ZX Spectrum",
    colors: [
        "#000000", "#0000D7", "#D70000", "#D700D7", "#00D700", "#00D7D7", "#D7D700", "#D7D7D7", 
        "#0000FF", "#FF0000", "#FF00FF", "#00FF00", "#00FFFF", "#FFFF00", "#FFFFFF"
    ].map(hexToRgb)
  },
  {
    name: "Virtual Boy (Red)",
    colors: ["#000000", "#380000", "#700000", "#A80000", "#E00000", "#FF0000"].map(hexToRgb)
  },
  {
    name: "CGA (Palette 1 High)",
    colors: ["#000000", "#55FFFF", "#FF55FF", "#FFFFFF"].map(hexToRgb)
  },
  {
    name: "Apple II",
    colors: [
        "#000000", "#722C40", "#483C88", "#7E3696", "#235446", "#808080", "#2D68C0", "#8996F8",
        "#5E4815", "#C06422", "#808080", "#EA92A7", "#489531", "#C7C042", "#86C7C2", "#FFFFFF"
    ].map(hexToRgb)
  },
  {
    name: "MSX",
    colors: [
        "#000000", "#000000", "#47B73B", "#74D07D", "#5955E0", "#8076F1", "#B95E51", "#FE5E51",
        "#DB6559", "#FF897D", "#CCC35E", "#DED087", "#3AA241", "#B766B5", "#CCCCCC", "#FFFFFF"
    ].map(hexToRgb)
  },

  // --- FAMOUS PIXEL ART PALETTES ---
  {
    name: "Arne 16",
    colors: [
        "#000000", "#9D9D9D", "#FFFFFF", "#BE2633", "#E06F8B", "#493C2B", "#A46422", "#EB8931", 
        "#F7E26B", "#2F484E", "#44891A", "#A3CE27", "#1B2632", "#005784", "#31A2F2", "#B2DCEF"
    ].map(hexToRgb)
  },
  {
    name: "Pico-8",
    colors: [
      "#000000", "#1D2B53", "#7E2553", "#008751", "#AB5236", "#5F574F", "#C2C3C7", "#FFF1E8",
      "#FF004D", "#FFA300", "#FFEC27", "#00E436", "#29ADFF", "#83769C", "#FF77A8", "#FFCCAA"
    ].map(hexToRgb)
  },
  {
    name: "Endesga 32",
    colors: [
        "#be4a2f", "#d77643", "#ead4aa", "#e4a672", "#b86f50", "#733e39", "#3e2731", "#a22633",
        "#e43b44", "#f77622", "#feae34", "#fee761", "#63c74d", "#3e8948", "#265c42", "#193c3e",
        "#124e89", "#0099db", "#2ce8f5", "#ffffff", "#c0cbdc", "#8b9bb4", "#5a6988", "#3a4466",
        "#262b44", "#181425", "#ff0044", "#68386c", "#b55088", "#f6757a", "#e8b796", "#c28569"
    ].map(hexToRgb)
  },
  {
    name: "Apollo (Modern)",
    colors: [
      "#312d45", "#554366", "#875e7a", "#b57f87", "#e0b09c", "#ffebcc", "#365c66", "#508c87",
      "#7ec4a5", "#c3e6b8", "#1d2333", "#233352", "#28547d", "#3b80a6", "#6dc2ca", "#aee6e6"
    ].map(hexToRgb)
  },
  {
    name: "Lost Century (Sepia)",
    colors: [
        "#2c2137", "#44293f", "#603b44", "#8b5251", "#c0785f", "#e6a378", "#fbd19b", "#fcf2c6",
        "#8c83c2", "#5e588c", "#383659", "#212136", "#4b4949", "#737070", "#9b9999", "#c4c4c4"
    ].map(hexToRgb)
  },

  // --- MODERN AESTHETICS ---
  {
    name: "Nord Theme",
    colors: [
        "#2E3440", "#3B4252", "#434C5E", "#4C566A", "#D8DEE9", "#E5E9F0", "#ECEFF4", "#8FBCBB", 
        "#88C0D0", "#81A1C1", "#5E81AC", "#BF616A", "#D08770", "#EBCB8B", "#A3BE8C", "#B48EAD"
    ].map(hexToRgb)
  },
  {
    name: "Gruvbox",
    colors: [
        "#282828", "#cc241d", "#98971a", "#d79921", "#458588", "#b16286", "#689d6a", "#a89984",
        "#928374", "#fb4934", "#b8bb26", "#fabd2f", "#83a598", "#d3869b", "#8ec07c", "#ebdbb2"
    ].map(hexToRgb)
  },
  {
    name: "Dracula",
    colors: [
        "#282a36", "#44475a", "#f8f8f2", "#6272a4", "#8be9fd", "#50fa7b", "#ffb86c", "#ff79c6", "#bd93f9", "#ff5555", "#f1fa8c"
    ].map(hexToRgb)
  },
  {
    name: "Solarized Dark",
    colors: [
        "#002b36", "#073642", "#586e75", "#657b83", "#839496", "#93a1a1", "#eee8d5", "#fdf6e3",
        "#b58900", "#cb4b16", "#dc322f", "#d33682", "#6c71c4", "#268bd2", "#2aa198", "#859900"
    ].map(hexToRgb)
  },
  {
    name: "Vaporwave",
    colors: [
        "#ff71ce", "#01cdfe", "#05ffa1", "#b967ff", "#fffb96", "#2B1A42", "#382962", "#181818"
    ].map(hexToRgb)
  },
  {
    name: "Cyberpunk Neon",
    colors: [
        "#0d001a", "#260033", "#4d004d", "#800060", "#b30059", "#ff0040", "#ff6600", "#ffcc00",
        "#ccff00", "#00ff66", "#00ffff", "#0099ff", "#0033ff", "#3300ff", "#6600cc", "#ffffff"
    ].map(hexToRgb)
  },

  // --- WEIRD / ATYPICAL / FX ---
  {
    name: "Matrix (Hacker)",
    colors: ["#000000", "#001100", "#003300", "#005500", "#007700", "#009900", "#00BB00", "#00DD00", "#00FF00", "#AAFFAA"].map(hexToRgb)
  },
  {
    name: "Heatmap (Thermal)",
    colors: ["#000000", "#000088", "#0000FF", "#0088FF", "#00FFFF", "#00FF88", "#00FF00", "#88FF00", "#FFFF00", "#FF8800", "#FF0000", "#FFFFFF"].map(hexToRgb)
  },
  {
    name: "Toxic Slime",
    colors: ["#1a0d26", "#2e0f38", "#45124d", "#2d4d12", "#477a1e", "#66a82e", "#8dd642", "#c4f274", "#e9fac2"].map(hexToRgb)
  },
  {
    name: "X-Ray (Inverted)",
    colors: ["#000000", "#101010", "#202020", "#304050", "#406080", "#5080b0", "#80a0d0", "#a0c0e0", "#d0e0f0", "#ffffff"].map(hexToRgb)
  },
  {
    name: "Cotton Candy",
    colors: ["#ffcce0", "#ffe0e9", "#fff0f5", "#e0f0ff", "#cce0ff", "#d0c0ff", "#e0d0ff", "#f0e0ff", "#ffffff"].map(hexToRgb)
  },
  {
    name: "Blueprint",
    colors: ["#001040", "#002060", "#003080", "#0040a0", "#0050c0", "#f0f0ff"].map(hexToRgb)
  },
  {
    name: "1-Bit (B&W)",
    colors: [{r:0,g:0,b:0}, {r:255,g:255,b:255}]
  }
];