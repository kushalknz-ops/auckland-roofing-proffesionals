import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const assetsDir = path.join(publicDir, 'assets');
const imgDir = path.join(assetsDir, 'img');
const masterAssetsDir = path.resolve('assets');
const masterImgDir = path.join(masterAssetsDir, 'img');

async function run() {
  console.log('Optimizing landing-video-poster from 4K master...');
  const posterMaster = path.join(masterAssetsDir, 'landing-video-poster-original.jpg');
  const posterJpg = path.join(assetsDir, 'landing-video-poster.jpg');
  const posterWebp = path.join(assetsDir, 'landing-video-poster.webp');
  const posterMobileWebp = path.join(assetsDir, 'landing-video-poster-mobile.webp');

  if (fs.existsSync(posterMaster)) {
    // 1920w Full HD desktop poster
    await sharp(posterMaster)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(posterJpg);

    await sharp(posterMaster)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(posterWebp);

    // 800w mobile poster
    await sharp(posterMaster)
      .resize(800, 450, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(posterMobileWebp);

    console.log(`Poster optimized: WebP=${fs.statSync(posterWebp).size}B, JPEG=${fs.statSync(posterJpg).size}B, Mobile=${fs.statSync(posterMobileWebp).size}B`);
  }

  // Optimize photography images from master 1536x1024 sources
  const masterFiles = fs.readdirSync(masterImgDir).filter((f) => f.endsWith('.jpg'));
  for (const file of masterFiles) {
    const srcPath = path.join(masterImgDir, file);
    const dstJpg = path.join(imgDir, file);
    const dstWebp = path.join(imgDir, file.replace(/\.jpg$/, '.webp'));

    // High quality 1536x1024 WebP (q82)
    await sharp(srcPath)
      .resize(1536, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(dstWebp);

    // High quality 1536x1024 progressive JPEG (q82 mozjpeg)
    await sharp(srcPath)
      .resize(1536, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(dstJpg);

    console.log(`Optimized ${file}: WebP=${fs.statSync(dstWebp).size}B, JPEG=${fs.statSync(dstJpg).size}B`);
  }

  // Upscale cert badges 2x with lanczos3
  for (const cert of ['cert-sitesafe.webp', 'cert-lbp.webp']) {
    const src = path.join(masterImgDir, cert);
    const dst = path.join(imgDir, cert);
    const meta = await sharp(src).metadata();
    await sharp(src)
      .resize(Math.round(meta.width * 2), Math.round(meta.height * 2), { kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 0.8, m1: 0.5, m2: 2 })
      .webp({ quality: 90, effort: 6 })
      .toFile(dst);
    console.log(`Upscaled ${cert}: ${fs.statSync(dst).size}B`);
  }

  // Lossless WebP logos
  for (const logo of ['logo-full.png', 'logo-navy.png', 'logo-mark.png']) {
    const p = path.join(assetsDir, logo);
    const webpP = path.join(assetsDir, logo.replace(/\.png$/, '.webp'));
    await sharp(p).webp({ lossless: true, effort: 6 }).toFile(webpP);
    console.log(`Generated ${path.basename(webpP)}: ${fs.statSync(webpP).size}B`);
  }

  console.log('All images optimized with pristine fidelity.');
}

run().catch(console.error);
