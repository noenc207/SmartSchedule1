const https = require('https');
const fs = require('fs');
const path = require('path');

const PHOTO_DIR = path.join(__dirname, 'photography');

const photos = [
  {
    filename: 'photo-campus-modern-library.webp',
    url: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80&fm=webp',
    author: 'Giammarco Boscaro',
    authorUrl: 'https://unsplash.com/@giammarcobs',
    unsplashId: '1521587760476-6c12a4b040da',
    title: 'Modern University Library Interior',
    license: 'Unsplash License (Free commercial & personal use)'
  },
  {
    filename: 'photo-students-collaborative-study.webp',
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80&fm=webp',
    author: 'Annie Spratt',
    authorUrl: 'https://unsplash.com/@anniespratt',
    unsplashId: '1522202176988-66273c2fd55f',
    title: 'Students Collaborating on Laptops in Academic Workspace',
    license: 'Unsplash License (Free commercial & personal use)'
  },
  {
    filename: 'photo-focus-desk-laptop.webp',
    url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80&fm=webp',
    author: 'Christopher Gower',
    authorUrl: 'https://unsplash.com/@cgower',
    unsplashId: '1498050108023-c5249f4df085',
    title: 'Minimalist Student Coding & Schedule Desk',
    license: 'Unsplash License (Free commercial & personal use)'
  },
  {
    filename: 'photo-coastal-horizon-sunrise.webp',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80&fm=webp',
    author: 'Sean Oulashin',
    authorUrl: 'https://unsplash.com/@oulashin',
    unsplashId: '1507525428034-b723cf961d3e',
    title: 'Serene Coastal Horizon & Dawn Glow (Quy Nhon Campus Ambience)',
    license: 'Unsplash License (Free commercial & personal use)'
  },
  {
    filename: 'photo-futuristic-lecture-hall.webp',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80&fm=webp',
    author: 'Headway',
    authorUrl: 'https://unsplash.com/@headwayio',
    unsplashId: '1517245386807-bb43f82c33c4',
    title: 'Modern Collaborative University Workshop & Lecture Hall',
    license: 'Unsplash License (Free commercial & personal use)'
  }
];

function download(item) {
  return new Promise((resolve, reject) => {
    const dest = path.join(PHOTO_DIR, item.filename);
    const file = fs.createWriteStream(dest);

    https.get(item.url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        https.get(response.headers.location, (redirectRes) => {
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            const size = fs.statSync(dest).size;
            console.log(`Downloaded (redirect): ${item.filename} (${(size / 1024).toFixed(1)} KB)`);
            resolve({ ...item, sizeBytes: size });
          });
        }).on('error', reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed with HTTP status ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(dest).size;
        console.log(`Downloaded: ${item.filename} (${(size / 1024).toFixed(1)} KB)`);
        resolve({ ...item, sizeBytes: size });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Downloading 5 curated academic photographs in WebP format...');
  for (const photo of photos) {
    try {
      await download(photo);
    } catch (e) {
      console.error(`Error downloading ${photo.filename}:`, e.message);
    }
  }
  console.log('Finished photography downloads.');
}

run();
