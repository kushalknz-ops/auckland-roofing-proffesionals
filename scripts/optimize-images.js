import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const assetsDir = path.join(publicDir, 'assets');
const imgDir = path.join(assetsDir, 'img');

async function run() {
  console.log('Optimizing landing-video-poster...');
  const posterPath = path.join(assetsDir, 'landing-video-poster.jpg');
  const posterWebp = path.join(assetsDir, 'landing-video-poster.webp');
  const posterMobileWebp = path.join(assetsDir, 'landing-video-poster-mobile.webp');
  
  // 1600w desktop poster (high quality, ~140KB)
  await sharp(posterPath)
    .resize(1600, null, { withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(posterPath + '.tmp');
  fs.renameSync(posterPath + '.tmp', posterPath);

  await sharp(posterPath)
    .resize(1600, null, { withoutEnlargement: true })
    .webp({ quality: 75, effort: 6 })
    .toFile(posterWebp);

  // 800w mobile poster (~45KB)
  await sharp(posterPath)
    .resize(800, null, { withoutEnlargement: true })
    .webp({ quality: 75, effort: 6 })
    .toFile(posterMobileWebp);

  console.log('Poster optimized.');

  const files = fs.readdirSync(imgDir);
  for (const file of files) {
    if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
      const filePath = path.join(imgDir, file);
      const webpPath = path.join(imgDir, file.replace(/\.jpe?g$/, '.webp'));
      const buffer = fs.readFileSync(filePath);

      // Resize to 960w max and compress to jpeg & webp
      await sharp(buffer)
        .resize(960, null, { withoutEnlargement: true })
        .webp({ quality: 75, effort: 5 })
        .toFile(webpPath);

      await sharp(buffer)
        .resize(960, null, { withoutEnlargement: true })
        .jpeg({ quality: 75, mozjpeg: true })
        .toFile(filePath + '.tmp');
      fs.renameSync(filePath + '.tmp', filePath);

      console.log(`Optimized ${file}: WebP=${fs.statSync(webpPath).size} bytes, JPEG=${fs.statSync(filePath).size} bytes`);
    }
  }
}

run().catch(console.error);
