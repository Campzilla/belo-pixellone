# 🎨 BELO PIXELLONE

<p align="center">
  <img src="assets/Logo mascotte.png" alt="Belo Pixellone Mascotte" width="200" />
</p>

**BELO PIXELLONE** is a powerful, offline, portable tool designed to convert high-resolution images into production-ready pixel art sprites. Unlike simple filters, this tool processes image data at the byte level to generate authentic retro graphics.

Built with **React**, **TypeScript**, and pure **Canvas API**. No heavy external image processing libraries just raw math and passion.

![Screenshot App](assets/screenshot%20app.jpg)

## ✨ Key Features

*   **⚡ 100% Offline & Client-Side:** Privacy-first. Images never leave your device.
*   **🧠 Smart Palette Extraction:** Uses **K-Means Clustering** to generate optimized palettes automatically.
*   **💾 Authentic Retro Export:** Generates **8-bit Indexed PNGs** with proper `PLTE` and `tRNS` chunks. Perfect for game engines.
*   **🎛️ Advanced Dithering:** Adjustable **Bayer Matrix (Ordered Dithering)** for that crunchy retro texture.
*   **🎨 Palette Management:** Includes presets (NES, GameBoy, Pico-8, Dracula, etc.) and allows custom palette uploads.
*   **🛠️ Fine-Tuning Tools:**
    *   Smart Downscaling & Block Size control.
    *   Despeckle (Noise reduction/cleaning).
    *   Color Grading (Contrast & Saturation).
    *   Background Removal (Auto-detect).
*   **🇮🇹/🇬🇧 Bilingual:** Fully localized in English and Italian.

## 🖼️ Examples

### AI Generated Art -> Pixel Art
![Comparison 1](assets/ai%20image%20test1.jpg)
*Converted to:*
![Result 1](assets/ai%20image%20result%20test1.jpg)

### Real Photo -> Retro Style
![Comparison 2](assets/real%20image%20test1.jpg)
*Converted to:*
![Result 2](assets/real%20image%20native%20result%20palette%20test1.jpg)

## 🚀 Tech Stack

*   **Core:** React 19 + TypeScript
*   **Styling:** TailwindCSS
*   **Processing:** Native HTML5 Canvas API + TypedArrays for high-performance pixel manipulation.
*   **Encoder:** Custom PNG implementation (Deflate/Adler-32) written from scratch in TypeScript.

## 📦 Usage

You can run this tool directly in your browser or build it locally.

1. Clone the repo
2. `npm install`
3. `npm run dev`

## ⚖️ License

Free & Open Source. Do whatever you want with it.
Directed & Curated by **Fred Campzilla**.
made by lazy people for lazy people
