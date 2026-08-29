export type WellStatus = 'normal' | 'risk' | 'lost'

export type Landmass = 'LAND' | 'WATER' | 'UNDERWATER'

export type Well = {
  id: string
  name: string
  distance: number
  depth: number
  formation: string
  status: WellStatus
  landmass: Landmass
  event?: string
  alert?: string

  // Temporary visual map coordinates
  location: {
    lat: number
    lng: number
  }
    x: number
    y: number
  
}

export const wells: Well[] = [
  {
    id: '15/9-F-4',
    location: {
  lat: 58.4300,
  lng: 1.7200,
},
    name: '15/9-F-4',
    distance: 0,
    depth: 3510,
    formation: 'Hugin',
    status: 'normal',
    landmass: 'LAND',
    x: 50,
    y: 50,
    event: 'No major historical event',
  },

  {
    id: '15/9-F-7',
    location: {
  lat: 58.4650,
  lng: 1.6800,
},
    name: '15/9-F-7',
    distance: 1.8,
    depth: 3420,
    formation: 'Hugin',
    status: 'normal',
    landmass: 'WATER',
    x: 31,
    y: 37,
    event: 'No major historical event',
  },

  {
    id: '15/9-F-9',
    location: {
  lat: 58.3900,
  lng: 1.7650,
},
    name: '15/9-F-9',
    distance: 3.2,
    depth: 3485,
    formation: 'Hugin',
    status: 'risk',
    landmass: 'UNDERWATER',
    x: 69,
    y: 32,
    event: 'Historical drilling event',
    alert: 'Historical risk detected',
  },
]