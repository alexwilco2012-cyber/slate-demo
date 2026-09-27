import type { ChipOption } from './choice-chips'

/** Aberdeen's postcode districts, with a couple of the places in each to help people choose. */
export const ABERDEEN_DISTRICTS: ChipOption<string>[] = [
  { value: 'AB10', label: 'AB10', hint: 'City centre, Ferryhill' },
  { value: 'AB11', label: 'AB11', hint: 'Torry, Footdee' },
  { value: 'AB12', label: 'AB12', hint: 'Cove, Kincorth' },
  { value: 'AB15', label: 'AB15', hint: 'West End, Cults' },
  { value: 'AB16', label: 'AB16', hint: 'Mastrick, Northfield' },
  { value: 'AB21', label: 'AB21', hint: 'Dyce, Bucksburn' },
  { value: 'AB22', label: 'AB22', hint: 'Bridge of Don' },
  { value: 'AB23', label: 'AB23', hint: 'Balmedie, Potterton' },
  { value: 'AB24', label: 'AB24', hint: 'Old Aberdeen, Seaton' },
  { value: 'AB25', label: 'AB25', hint: 'Rosemount, Westburn' },
]
