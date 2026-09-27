import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge must know the custom scale names, or it would read `text-body` as a colour and
// silently drop a `text-ink` next to it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display-xl', 'display-l', 'display-m', 'title', 'body-l', 'body', 'small', 'caption'],
      radius: ['control', 'card', 'sheet'],
      shadow: ['soft', 'raised', 'overlay'],
      ease: ['out-soft', 'in-soft', 'standard'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
