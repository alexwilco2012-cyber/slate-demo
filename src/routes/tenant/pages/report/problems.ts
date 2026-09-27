// The rooms and the common problems offered as big choices when reporting, so most people can tap
// rather than type. Each maps to a job category; the words are the tenant's, not the trade's.

import {
  ArmchairIcon,
  BathtubIcon,
  BedIcon,
  BellRingingIcon,
  BugIcon,
  CookingPotIcon,
  DoorOpenIcon,
  DotsThreeOutlineIcon,
  DropHalfIcon,
  DropIcon,
  FanIcon,
  FireIcon,
  HouseIcon,
  HouseLineIcon,
  LightningIcon,
  LockKeyIcon,
  PlantIcon,
  StairsIcon,
  ThermometerColdIcon,
  ToiletIcon,
  WashingMachineIcon,
  DoorIcon,
  type Icon,
} from '@phosphor-icons/react'
import { ROOMS, ROOM_LABELS, type JobCategory, type Room } from '@/domain/types'

export const ROOM_ICONS: Record<Room, Icon> = {
  kitchen: CookingPotIcon,
  bathroom: BathtubIcon,
  bedroom: BedIcon,
  living_room: ArmchairIcon,
  hall: DoorIcon,
  common_close: StairsIcon,
  outside: PlantIcon,
  whole_home: HouseIcon,
  other: DotsThreeOutlineIcon,
}

export const ROOM_CHOICES = ROOMS.map((room) => ({
  value: room,
  label: ROOM_LABELS[room],
  icon: ROOM_ICONS[room],
}))

/** "in the kitchen", used to build a short title such as "Leak or drip in the kitchen". */
export const ROOM_PHRASE: Record<Room, string> = {
  kitchen: 'in the kitchen',
  bathroom: 'in the bathroom',
  bedroom: 'in the bedroom',
  living_room: 'in the living room',
  hall: 'in the hall',
  common_close: 'in the shared close',
  outside: 'outside',
  whole_home: 'around the home',
  other: '',
}

export interface CommonProblem {
  id: string
  label: string
  /** A plain line under the label, to help people pick. */
  hint: string
  category: JobCategory
  icon: Icon
  /** A possible gas leak: show the emergency advice straight away. */
  gas?: boolean
}

const PROBLEMS = {
  leak: {
    id: 'leak',
    label: 'Leak or drip',
    hint: 'Water where it shouldn’t be',
    category: 'leak',
    icon: DropIcon,
  },
  blocked: {
    id: 'blocked',
    label: 'Blocked sink, bath or toilet',
    hint: 'Slow to drain, or won’t flush',
    category: 'drains',
    icon: ToiletIcon,
  },
  heating: {
    id: 'heating',
    label: 'Heating or hot water',
    hint: 'Cold radiators, no hot water, boiler faults',
    category: 'heating',
    icon: ThermometerColdIcon,
  },
  damp: {
    id: 'damp',
    label: 'Damp or mould',
    hint: 'Wet patches, black spots, a musty smell',
    category: 'damp',
    icon: DropHalfIcon,
  },
  electrics: {
    id: 'electrics',
    label: 'Lights, sockets or switches',
    hint: 'Not working, flickering or tripping',
    category: 'electrics',
    icon: LightningIcon,
  },
  gas: {
    id: 'gas',
    label: 'Gas cooker, fire or gas smell',
    hint: 'A smell of gas is always an emergency',
    category: 'gas_appliance',
    icon: FireIcon,
    gas: true,
  },
  appliance: {
    id: 'appliance',
    label: 'Appliance not working',
    hint: 'Fridge, oven, washing machine and so on',
    category: 'appliance',
    icon: WashingMachineIcon,
  },
  fan: {
    id: 'fan',
    label: 'Extractor fan',
    hint: 'Not running, or very loud',
    category: 'electrics',
    icon: FanIcon,
  },
  alarm: {
    id: 'alarm',
    label: 'Smoke, heat or carbon monoxide alarm',
    hint: 'Beeping, faulty or missing',
    category: 'electrics',
    icon: BellRingingIcon,
  },
  door: {
    id: 'door',
    label: 'Door, window or lock',
    hint: 'Sticking, broken or won’t lock',
    category: 'doors_windows_locks',
    icon: DoorOpenIcon,
  },
  entry: {
    id: 'entry',
    label: 'Entry door, buzzer or lock',
    hint: 'Can’t get in, or it won’t shut',
    category: 'doors_windows_locks',
    icon: LockKeyIcon,
  },
  roof: {
    id: 'roof',
    label: 'Roof, gutters or outside walls',
    hint: 'Slipped slates, overflowing gutters, cracks',
    category: 'roof_outside',
    icon: HouseLineIcon,
  },
  pests: {
    id: 'pests',
    label: 'Mice, insects or other pests',
    hint: 'Droppings, nests or damage',
    category: 'pests',
    icon: BugIcon,
  },
  other: {
    id: 'other',
    label: 'Something else',
    hint: 'Describe it in your own words below',
    category: 'other',
    icon: DotsThreeOutlineIcon,
  },
} as const satisfies Record<string, CommonProblem>

type ProblemId = keyof typeof PROBLEMS

const BY_ROOM: Record<Room, readonly ProblemId[]> = {
  kitchen: ['leak', 'blocked', 'appliance', 'electrics', 'gas', 'damp', 'pests', 'door', 'other'],
  bathroom: ['leak', 'blocked', 'heating', 'fan', 'damp', 'electrics', 'door', 'other'],
  bedroom: ['heating', 'damp', 'electrics', 'door', 'leak', 'pests', 'other'],
  living_room: ['heating', 'electrics', 'damp', 'door', 'gas', 'leak', 'pests', 'other'],
  hall: ['entry', 'alarm', 'electrics', 'heating', 'damp', 'other'],
  common_close: ['entry', 'electrics', 'leak', 'roof', 'pests', 'other'],
  outside: ['roof', 'leak', 'entry', 'pests', 'other'],
  whole_home: ['heating', 'electrics', 'gas', 'leak', 'alarm', 'damp', 'pests', 'other'],
  other: ['leak', 'heating', 'electrics', 'gas', 'damp', 'door', 'appliance', 'pests', 'other'],
}

export function problemsFor(room: Room): CommonProblem[] {
  return BY_ROOM[room].map((id) => PROBLEMS[id])
}

export function problemById(id: string | undefined): CommonProblem | undefined {
  return id && id in PROBLEMS ? PROBLEMS[id as ProblemId] : undefined
}

/**
 * A short title for lists: "Leak or drip in the kitchen". For "Something else", the start of the
 * tenant's own description reads better than a category name.
 */
export function titleFor(problem: CommonProblem, room: Room, description: string): string {
  if (problem.id === 'other') {
    const first = description.trim().split(/(?<=[.!?])\s/)[0] ?? ''
    const clipped = first.length > 70 ? `${first.slice(0, 67).trimEnd()}…` : first
    return clipped.replace(/[.!?]$/, '') || 'Something needs fixing'
  }
  return `${problem.label} ${ROOM_PHRASE[room]}`.trim()
}
