/** Sources with generated, aspect-ratio-preserving WebP variants. */
export const responsiveImageSources = [
  '/assets/img/project-albany.webp',
  '/assets/img/project-remuera.webp',
  '/assets/img/project-warehouse.webp',
  '/assets/img/svc-metal-commercial.webp',
  '/assets/img/svc-metal-res.webp',
] as const

export const responsiveImageWidths = [600, 1000] as const

export function responsiveImagePath(src: string, width: number) {
  const filename = src.slice(src.lastIndexOf('/') + 1).replace(/\.webp$/, '')
  return `/assets/img/responsive/${filename}-${width}.webp`
}

/** Keep unknown images on their original source instead of requesting missing variants. */
export function getResponsiveImageProps(src: string, sizes: string): { srcSet?: string; sizes?: string } {
  if (!responsiveImageSources.some((source) => source === src)) return {}

  return {
    srcSet: [
      ...responsiveImageWidths.map((width) => `${responsiveImagePath(src, width)} ${width}w`),
      `${src} 1536w`,
    ].join(', '),
    sizes,
  }
}
