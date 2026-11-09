import assert from 'node:assert/strict'
import { mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { responsiveImagePath, responsiveImageSources, responsiveImageWidths } from '../src/lib/responsive-images.ts'

const publicDirectory = new URL('../public/', import.meta.url)
const publicPath = (url) => fileURLToPath(new URL(url.replace(/^\//, ''), publicDirectory))
await mkdir(new URL('assets/img/responsive/', publicDirectory), { recursive: true })

for (const source of responsiveImageSources) {
  const input = publicPath(source)
  const original = await sharp(input).metadata()
  assert.equal(original.width, 1536, `${source}: update the srcset width when changing the source`)
  const originalBytes = (await stat(input)).size

  for (const width of responsiveImageWidths) {
    const output = publicPath(responsiveImagePath(source, width))
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(output)

    const generated = await sharp(output).metadata()
    assert.equal(generated.width, width)
    assert.equal(generated.height, Math.round(original.height * width / original.width))
    assert.equal(generated.format, 'webp')
    const bytes = (await stat(output)).size
    assert.ok(bytes < originalBytes, `${output} should be smaller than its full-size source`)
    console.log(`${responsiveImagePath(source, width)}: ${width}×${generated.height}, ${bytes} bytes (${Math.round((1 - bytes / originalBytes) * 100)}% smaller)`)
  }
}
