// Photos taken on site. The demo keeps everything in the browser's storage, which holds a few
// megabytes at most, so each photo is shrunk to a small JPEG before it is saved.

import { isPlaceholder } from '@/data'

const MAX_EDGE = 960
const QUALITY = 0.72

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the photo.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('That file is not a photo we can read.'))
    image.src = src
  })
}

/** A phone photo as a JPEG data URL no larger than 960px along its longest edge. */
export async function shrinkPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo.')
  const original = await readAsDataUrl(file)
  try {
    const image = await loadImage(original)
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) return original
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', QUALITY)
  } catch {
    // Some browsers can't decode every format (HEIC, say) into a canvas: keep the original.
    return original
  }
}

/** Seed photos are placeholders drawn as tiles; photos taken in the demo are real images. */
export function isRealPhoto(url: string): boolean {
  return !isPlaceholder(url)
}
