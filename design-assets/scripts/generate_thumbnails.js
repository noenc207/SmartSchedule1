const https = require('https');
const fs = require('fs');
const path = require('path');

const THUMB_DIR = path.join(__dirname, 'thumbnails');
const BG_DIR = path.join(__dirname, 'backgrounds');
const TEX_DIR = path.join(__dirname, 'textures');
const ILL_DIR = path.join(__dirname, 'illustrations');

// Copy SVGs to thumbnails with clean names
function copySvgThumbs(sourceDir, prefix) {
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.svg'));
  files.forEach(f => {
    const src = path.join(sourceDir, f);
    const dest = path.join(THUMB_DIR, f);
    fs.copyFileSync(src, dest);
  });
  console.log(`Copied ${files.length} SVG thumbnails from ${path.basename(sourceDir)}`);
}

copySvgThumbs(BG_DIR, 'bg');
copySvgThumbs(TEX_DIR, 'tex');
copySvgThumbs(ILL_DIR, 'ill');

// Download small 200px WebP thumbnails for photography
const photoThumbs = [
  {
    filename: 'photo-campus-modern-library.webp',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=240&q=70&fm=webp'
  },
  {
    filename: 'photo-students-collaborative-study.webp',
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=240&q=70&fm=webp'
  },
  {
    filename: 'photo-focus-desk-laptop.webp',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=240&q=70&fm=webp'
  },
  {
    filename: 'photo-coastal-horizon-sunrise.webp',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=240&q=70&fm=webp'
  },
  {
    filename: 'photo-futuristic-lecture-hall.webp',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=240&q=70&fm=webp'
  }
];

function download(item) {
  return new Promise((resolve, reject) => {
    const dest = path.join(THUMB_DIR, item.filename);
    const file = fs.createWriteStream(dest);

    https.get(item.url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        https.get(response.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            const size = fs.statSync(dest).size;
            console.log(`Thumbnail downloaded: ${item.filename} (${(size / 1024).toFixed(1)} KB)`);
            resolve(size);
          });
        }).on('error', reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed with status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(dest).size;
        console.log(`Thumbnail downloaded: ${item.filename} (${(size / 1024).toFixed(1)} KB)`);
        resolve(size);
      });
    }).on('error', reject);
  });
}

async function run() {
  for (const pt of photoThumbs) {
    try {
      await download(pt);
    } catch (e) {
      console.error(`Error downloading thumbnail ${pt.filename}:`, e.message);
    }
  }
  console.log('Thumbnail generation completed.');
}

run();
