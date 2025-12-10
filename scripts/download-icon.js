import fs from 'fs';
import https from 'https';
import pngToIco from 'png-to-ico';
import path from 'path';
import sharp from 'sharp';

const url = 'https://res.cloudinary.com/daily-now/image/upload/f_auto,q_auto/v1/posts/845188448f7252274431d1d81232822a?_a=BAMCkGfi0';
const pngPath = path.resolve('build/icon.png');
const icoPath = path.resolve('build/icon.ico');

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Referer': 'https://daily.dev/'
  }
};

async function generateFallback() {
  console.log('Generating fallback icon...');
  try {
    // Create a green pixel-art style background
    await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="256" height="256" viewBox="0 0 256 256">
            <rect x="32" y="32" width="192" height="192" fill="#4ade80" rx="20" />
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="120" fill="#1e1e2e">P</text>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toFile(pngPath);
    
    console.log('Fallback PNG created.');
    await convertToIco();
  } catch (err) {
    console.error('Error creating fallback:', err);
  }
}

async function convertToIco() {
  try {
    console.log('Converting to .ico...');
    const icoBuf = await pngToIco(pngPath);
    fs.writeFileSync(icoPath, icoBuf);
    console.log('Icon converted to', icoPath);
  } catch (err) {
    console.error('Error converting to ico:', err);
  }
}

console.log('Downloading icon...');

const req = https.get(url, options, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download image. Status Code: ${response.statusCode}`);
    response.resume();
    generateFallback();
    return;
  }

  const chunks = [];
  response.on('data', (chunk) => chunks.push(chunk));
  
  response.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    console.log(`Downloaded ${buffer.length} bytes.`);
    
    if (buffer.length < 1000) {
       console.log('File too small, likely error page. Using fallback.');
       generateFallback();
       return;
    }

    try {
      console.log('Processing with Sharp...');
      await sharp(buffer)
        .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(pngPath);
        
      console.log('Normalized PNG saved to', pngPath);
      await convertToIco();

    } catch (err) {
      console.error('Error processing image:', err);
      generateFallback();
    }
  });

});

req.on('error', (err) => {
  console.error('Error downloading image:', err.message);
  generateFallback();
});
