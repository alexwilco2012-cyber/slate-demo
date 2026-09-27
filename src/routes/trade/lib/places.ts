// Directions to a job. Only the street goes to the maps app: "Second Floor Left" means nothing to
// a sat nav, and the flat position is on the job for when the trade arrives.

import type { Property } from '@/domain/types'

export function streetOf(addressLine: string): string {
  return addressLine.split(',').at(-1)?.trim() ?? addressLine
}

/** Opens turn-by-turn directions in the phone's maps app (or Google Maps on a computer). */
export function directionsUrl(property: Pick<Property, 'addressLine' | 'city' | 'postcode'>) {
  const destination = `${streetOf(property.addressLine)}, ${property.city} ${property.postcode}`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
