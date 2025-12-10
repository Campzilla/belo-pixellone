import fs from 'fs';
import pngToIco from 'png-to-ico';
import path from 'path';
import sharp from 'sharp';

// Source file is in the root project folder (parent of belo-pixellone based on search result)
// The search result was c:\INTELLIGGIENCIER\BELO PIXELLONE\beloicone.png
// The script runs in c:\INTELLIGGIENCIER\BELO PIXELLONE\belo-pixellone
// So the path is ../beloicone.png
const sourcePath = path.resolve('../beloicone.png');
const pngPath = path.resolve('build/icon.png');
const icoPath = path.resolve('build/icon.ico');

async function processIcon() {
  console.log(`Looking for icon at: ${sourcePath}`);

  if (!fs.existsSync(sourcePath)) {
    console.error('Error: Source icon file not found!');
    process.exit(1);
  }

  try {
    console.log('Processing with Sharp...');
    
    // Resize to 256x256 and ensure PNG format
    await sharp(sourcePath)
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(pngPath);
      
    console.log('Normalized PNG saved to', pngPath);

    // Convert to ICO
    console.log('Converting to .ico...');
    const icoBuf = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, icoBuf);
    console.log('Icon converted to', icoPath);

  } catch (err) {
    console.error('Error processing image:', err);
    process.exit(1);
  }
}

processIcon();
