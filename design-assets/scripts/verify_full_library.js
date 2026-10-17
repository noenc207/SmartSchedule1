const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));

console.log('=== FULL ASSET & ANIMATION LIBRARY VERIFICATION ===');
console.log(`Total Assets Registered in Catalog: ${catalog.assets.length}`);

let missingFiles = 0;
let corruptedFiles = 0;
let totalBytes = 0;

const formatCounts = {
  svg: 0,
  webp: 0,
  gif: 0,
  webm: 0,
  lottie: 0,
  png_thumb: 0
};

catalog.assets.forEach(asset => {
  const primaryPath = path.join(ROOT, asset.file);
  const thumbPath = path.join(ROOT, asset.thumbnail);

  if (!fs.existsSync(primaryPath)) {
    console.error(`[FAIL] Missing primary file: ${asset.file}`);
    missingFiles++;
  } else {
    const stat = fs.statSync(primaryPath);
    if (stat.size === 0) {
      console.error(`[FAIL] Zero-byte file: ${asset.file}`);
      corruptedFiles++;
    } else {
      totalBytes += stat.size;
      const ext = path.extname(primaryPath).replace('.', '');
      formatCounts[ext] = (formatCounts[ext] || 0) + 1;
    }
  }

  if (!fs.existsSync(thumbPath)) {
    console.error(`[FAIL] Missing thumbnail: ${asset.thumbnail}`);
    missingFiles++;
  } else {
    totalBytes += fs.statSync(thumbPath).size;
  }

  // If animation, check companion formats
  if (asset.category === 'animations') {
    if (asset.optimizedWebm) {
      const webmPath = path.join(ROOT, asset.optimizedWebm);
      if (!fs.existsSync(webmPath)) {
        console.error(`[FAIL] Missing WebM: ${asset.optimizedWebm}`);
        missingFiles++;
      } else {
        totalBytes += fs.statSync(webmPath).size;
        formatCounts.webm++;
      }
    }
    if (asset.optimizedWebp) {
      const webpPath = path.join(ROOT, asset.optimizedWebp);
      if (!fs.existsSync(webpPath)) {
        console.error(`[FAIL] Missing WebP: ${asset.optimizedWebp}`);
        missingFiles++;
      } else {
        totalBytes += fs.statSync(webpPath).size;
      }
    }
    if (asset.lottieJson) {
      const lottiePath = path.join(ROOT, asset.lottieJson);
      if (!fs.existsSync(lottiePath)) {
        console.error(`[FAIL] Missing Lottie: ${asset.lottieJson}`);
        missingFiles++;
      } else {
        totalBytes += fs.statSync(lottiePath).size;
        formatCounts.lottie++;
      }
    }
  }
});

console.log('\n--- VERIFICATION RESULTS ---');
console.log(`Missing Files: ${missingFiles}`);
console.log(`Corrupted Files: ${corruptedFiles}`);
console.log(`Total Library Verified Size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log('Format Breakdown:', formatCounts);
console.log('Category Counts:', catalog.summary.categories);

if (missingFiles === 0 && corruptedFiles === 0) {
  console.log('\n[SUCCESS] All assets and animation formats 100% verified on disk!');
} else {
  process.exit(1);
}
