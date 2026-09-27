// Rough geography for the job board: how far a job is from a trade's base, by postcode district.
// Slate only ever shows the district of a job before a trade is chosen, so distances are measured
// between district centres and rounded, never from a street address.

import type { PostcodeDistrict } from './types'

/** Approximate centres of the Aberdeen postcode districts, in degrees. */
const DISTRICT_CENTRES: Readonly<Record<string, readonly [lat: number, lng: number]>> = {
  AB10: [57.137, -2.117],
  AB11: [57.134, -2.088],
  AB12: [57.105, -2.109],
  AB13: [57.106, -2.26],
  AB14: [57.094, -2.314],
  AB15: [57.142, -2.164],
  AB16: [57.16, -2.153],
  AB21: [57.205, -2.197],
  AB22: [57.186, -2.1],
  AB23: [57.212, -2.087],
  AB24: [57.165, -2.106],
  AB25: [57.151, -2.115],
}

/** How far a trade is willing to look, as shown on the job board filter. */
export const DISTANCE_BANDS = [
  'within_2_miles',
  'within_5_miles',
  'within_10_miles',
  'any',
] as const
export type DistanceBand = (typeof DISTANCE_BANDS)[number]
export const DISTANCE_BAND_LABELS = {
  within_2_miles: 'Within 2 miles',
  within_5_miles: 'Within 5 miles',
  within_10_miles: 'Within 10 miles',
  any: 'Any distance',
} as const satisfies Record<DistanceBand, string>
const BAND_LIMIT_MILES: Record<DistanceBand, number> = {
  within_2_miles: 2,
  within_5_miles: 5,
  within_10_miles: 10,
  any: Number.POSITIVE_INFINITY,
}

const EARTH_RADIUS_MILES = 3958.8

export function isKnownDistrict(district: PostcodeDistrict): boolean {
  return district.toUpperCase() in DISTRICT_CENTRES
}

/**
 * Miles between two districts' centres, rounded to the nearest half mile. The same district is
 * 0. Null when either district isn't one we know, so screens can say "distance unknown".
 */
export function milesBetween(from: PostcodeDistrict, to: PostcodeDistrict): number | null {
  const a = DISTRICT_CENTRES[from.toUpperCase()]
  const b = DISTRICT_CENTRES[to.toUpperCase()]
  if (!a || !b) return null
  if (a === b) return 0
  const rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad
  const dLng = (b[1] - a[1]) * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2
  const miles = 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
  return Math.round(miles * 2) / 2
}

/** The smallest band a distance fits in. An unknown distance only fits 'any'. */
export function distanceBandOf(miles: number | null): DistanceBand {
  if (miles === null) return 'any'
  return DISTANCE_BANDS.find((band) => miles <= BAND_LIMIT_MILES[band]) ?? 'any'
}

/** Whether a job this far away belongs in the band the trade chose. */
export function withinBand(miles: number | null, band: DistanceBand): boolean {
  if (band === 'any') return true
  return miles !== null && miles <= BAND_LIMIT_MILES[band]
}
