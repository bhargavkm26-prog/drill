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

