import {
  APIProvider,
  Map,
  AdvancedMarker,
  Circle,
} from '@vis.gl/react-google-maps'

import { useNavigate } from 'react-router-dom'
import type { Well } from '../data/wells'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

type WellMapProps = {
  activeWell: Well
  visibleWells: Well[]
  selectedWell: Well | null
  radiusKM: number
  onSelectWell: (well: Well | null) => void
}

function WellMap({
  activeWell,
  visibleWells,
  selectedWell,
  radiusKM,
  onSelectWell,
}: WellMapProps) {
  const navigate = useNavigate()

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="relative h-full w-full">

        <Map
          defaultCenter={activeWell.location}
          defaultZoom={12}
          mapId="3e5e69b3b31fc49e5bb18e05"
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl
          fullscreenControl
          streetViewControl
        >

          {/* ================= RADIUS ================= */}

          <Circle
            center={activeWell.location}
            radius={radiusKM * 1000}
            options={{
              strokeColor: '#FDB813',
              strokeOpacity: 0.9,
              strokeWeight: 1.5,
              fillColor: '#FDB813',
              fillOpacity: 0.06,
              clickable: false,
            }}
          />

          {/* ================= WELL MARKERS ================= */}

          {visibleWells.map((well) => {

            const isActive = well.id === activeWell.id

            /*
             * NORMAL:
             * yellow
             *
             * RISK / LOST / INACTIVE / ALERT:
             * red
             *
             * ACTIVE:
             * white centre + yellow glow
             */

            const isRisk =
              well.status === 'risk' ||
              well.status === 'lost' ||
            
              !!well.alert

            return (
              <AdvancedMarker
                key={well.id}
                position={well.location}
                onClick={() => onSelectWell(well)}
              >

                <div className="relative">

                  {/* ================= ACTIVE WELL GLOW ================= */}

                  {isActive && (
                    <>
                      <div className="absolute -inset-6 rounded-full bg-white/30 blur-xl" />

                      <div className="absolute -inset-4 rounded-full border-2 border-[#FDB813]/70" />

                      <div className="absolute -inset-2 rounded-full border border-white/30" />
                    </>
                  )}

                  {/* ================= WELL MARKER ================= */}

                  <div
                    className={`relative h-5 w-5 rounded-full border-2 ${
                      isActive
                        ? 'border-[#FDB813] bg-white shadow-[0_0_20px_rgba(255,255,255,0.9)]'
                        : isRisk
                          ? 'border-red-500 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                          : 'border-[#FDB813] bg-[#FDB813] shadow-[0_0_8px_rgba(253,184,19,0.5)]'
                    }`}
                  />

                  {/* ================= WELL ID ================= */}

                  <div
                    className={`absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/85 px-2 py-1 text-[10px] font-bold tracking-wider ${
                      isActive
                        ? 'text-white'
                        : isRisk
                          ? 'text-red-400'
                          : 'text-[#FDB813]'
                    }`}
                  >
                    {well.id}
                  </div>

                </div>

              </AdvancedMarker>
            )
          })}

        </Map>

        {/* ========================================================= */}
        {/*                     WELL DETAILS CARD                     */}
        {/* ========================================================= */}

        {selectedWell && (
          <div className="absolute left-1/2 top-1/2 z-20 w-[320px] -translate-x-1/2 -translate-y-1/2 border border-white/10 border-t-2 border-t-[#FDB813] bg-black/95 p-5 text-white shadow-2xl">

            {/* ================= HEADER ================= */}

            <div className="mb-5 flex items-center justify-between">

              <div>
                <p className="mb-1 text-[9px] tracking-[0.25em] text-white/40">
                  SELECTED WELL
                </p>

                <h3 className="text-lg font-bold tracking-[0.12em]">
                  {selectedWell.id}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onSelectWell(null)}
                className="text-xl text-white/40 transition hover:text-white"
              >
                ×
              </button>

            </div>

            {/* ================= STATUS ================= */}

            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">

              <span className="text-[10px] tracking-[0.2em] text-white/40">
                STATUS
              </span>

              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  selectedWell.id === activeWell.id
                    ? 'text-[#FDB813]'
                    : selectedWell.status === 'risk' ||
                        selectedWell.status === 'lost' ||
                        selectedWell.alert
                      ? 'text-red-400'
                      : 'text-[#FDB813]'
                }`}
              >
                {selectedWell.id === activeWell.id
                  ? 'ACTIVE'
                  : selectedWell.status || 'NORMAL'}
              </span>

            </div>

            {/* ================= DATA ================= */}

            <div className="space-y-3 text-sm">

              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] tracking-[0.15em] text-white/40">
                  DISTANCE
                </span>

                <span>
                  {selectedWell.distance ?? 0} km
                </span>
              </div>

              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] tracking-[0.15em] text-white/40">
                  TRUE DEPTH
                </span>

                <span>
                  {selectedWell.depth} m
                </span>
              </div>

              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] tracking-[0.15em] text-white/40">
                  LANDMASS
                </span>

                <span className="uppercase">
                  {selectedWell.landmass}
                </span>
              </div>

              {/* ================= EVENT ================= */}

              <div className="pt-1">

                <span className="text-[10px] tracking-[0.15em] text-white/40">
                  EVENT
                </span>

                <p
                  className={`mt-1 text-xs ${
                    selectedWell.alert || selectedWell.event
                      ? 'text-red-400'
                      : 'text-white/60'
                  }`}
                >
                  {selectedWell.alert ||
                    selectedWell.event ||
                    'No significant event'}
                </p>

              </div>

            </div>

            {/* ===================================================== */}
            {/*                    VIEW DETAILS                       */}
            {/* ===================================================== */}

            <button
              type="button"
              onClick={() =>
                navigate(`/wells/${encodeURIComponent(selectedWell.id)}`)
              }
              className="mt-5 flex w-full items-center justify-center gap-2 bg-[#FDB813] px-4 py-3 text-xs font-bold tracking-[0.15em] text-black transition hover:bg-[#e5a500]"
            >
              VIEW DETAILS
              <span className="text-sm">→</span>
            </button>

          </div>
        )}

      </div>
    </APIProvider>
  )
}

export default WellMap