import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { wells, type Well } from '../../data/wells'

function Explore() {
  const [activeWell, setActiveWell] = useState<Well | null>(null)
  const [search, setSearch] = useState('')
  const [showWellList, setShowWellList] = useState(false)
  const [radius, setRadius] = useState(5)
  const [selectedWell, setSelectedWell] = useState<Well | null>(null)
  const [zoom, setZoom] = useState(1)

  const filteredWells = useMemo(() => {
    if (!search.trim()) return wells

    return wells.filter((well) =>
      well.id.toLowerCase().includes(search.toLowerCase()),
    )
  }, [search])

  const visibleWells = useMemo(() => {
    if (!activeWell) return []

    return wells
      .map((well) => {
        if (well.id === activeWell.id) {
          return {
            ...well,
            distance: 0,
          }
        }

        const dx = well.x - activeWell.x
        const dy = well.y - activeWell.y

        const distance = Number(
          (Math.sqrt(dx * dx + dy * dy) / 10).toFixed(1),
        )

        return {
          ...well,
          distance,
        }
      })
      .filter(
        (well) =>
          well.id === activeWell.id || well.distance <= radius,
      )
  }, [activeWell, radius])

  const handleSelectWell = (well: Well) => {
    setActiveWell(well)
    setSelectedWell(null)
    setSearch(well.id)
    setShowWellList(false)
    setZoom(1)
  }

  return (
    <main className="min-h-screen bg-white text-black">

      {/* Navigation */}

      <nav className="flex h-20 items-center justify-between border-b border-black/10 px-8">

        <Link
          to="/workspace"
          className="text-xl font-bold tracking-tight"
        >
          NWIS
        </Link>

        <div className="flex items-center gap-10 text-xs font-semibold tracking-[0.15em]">

          <Link
            to="/explore"
            className="text-[#FDB813]"
          >
            EXPLORE
          </Link>

          <Link
            to="/monitor"
            className="transition hover:text-[#FDB813]"
          >
            MONITOR / ALERTS
          </Link>

          <Link
            to="/investigate"
            className="transition hover:text-[#FDB813]"
          >
            INVESTIGATE
          </Link>

        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20 text-xs">
          M
        </div>

      </nav>


      {/* Main */}

      <section className="px-8 pb-10 pt-12">

        <div className="mx-auto max-w-7xl">

          {/* Header */}

          <div className="mb-10 text-center">

            <p className="mb-2 text-xs font-semibold tracking-[0.25em] text-black/40">
              EXPLORE
            </p>

            <h1 className="text-6xl font-bold tracking-[-0.04em]">
              WELLS
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-black/45">
              Explore wells surrounding the active well and identify
              nearby drilling intelligence.
            </p>

          </div>


          {/* Well search */}

          <div className="relative mb-8 flex justify-center">

            <div className="w-full max-w-xl">

              <label
                htmlFor="explore-well-search"
                className="mb-2 block text-center text-[10px] font-bold tracking-[0.2em] text-black/50"
              >
                SELECT ACTIVE WELL
              </label>

              <input
                id="explore-well-search"
                type="text"
                value={search}
                placeholder="ENTER WELL ID"
                autoComplete="off"
                onFocus={() => setShowWellList(true)}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setShowWellList(true)
                }}
                className="h-14 w-full border border-black/20 bg-white px-5 text-center text-sm font-semibold tracking-[0.08em] outline-none transition focus:border-[#FDB813]"
              />

              {showWellList && (
                <div className="absolute left-1/2 top-[78px] z-30 w-full max-w-xl -translate-x-1/2 border border-black/15 bg-white text-left shadow-lg">

                  <div className="border-b border-black/10 px-5 py-3">
                    <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                      AVAILABLE WELLS
                    </p>
                  </div>

                  {filteredWells.map((well) => (
                    <button
                      key={well.id}
                      type="button"
                      onClick={() => handleSelectWell(well)}
                      className="flex w-full items-center justify-between border-b border-black/10 px-5 py-4 text-left transition last:border-b-0 hover:bg-black hover:text-white"
                    >

                      <div>
                        <p className="text-sm font-bold">
                          {well.id}
                        </p>

                        <p className="mt-1 text-[10px] tracking-widest opacity-50">
                          {well.formation} · {well.depth} m
                        </p>
                      </div>

                      <span
                        className={`text-[9px] font-bold tracking-widest ${
                          well.status === 'risk'
                            ? 'text-red-500'
                            : 'text-[#FDB813]'
                        }`}
                      >
                        {well.status.toUpperCase()}
                      </span>

                    </button>
                  ))}

                </div>
              )}

            </div>

          </div>


          {/* Empty state */}

          {!activeWell && (
            <div className="flex min-h-[520px] items-center justify-center border border-black/10">

              <div className="text-center">

                <div className="mx-auto mb-5 h-3 w-3 rounded-full bg-[#FDB813]" />

                <p className="text-xs font-bold tracking-[0.25em]">
                  SELECT A WELL TO EXPLORE
                </p>

                <p className="mt-3 text-xs text-black/40">
                  Select an active well to discover nearby wells.
                </p>

              </div>

            </div>
          )}


          {/* Explore map */}

          {activeWell && (
            <>

              {/* Controls */}

              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">

                <div className="flex items-center gap-3">

                  <span className="h-2.5 w-2.5 rounded-full bg-white ring-2 ring-[#FDB813]" />

                  <span className="text-xs font-bold tracking-[0.15em]">
                    ACTIVE WELL
                  </span>

                  <span className="text-sm font-semibold">
                    {activeWell.id}
                  </span>

                </div>


                <div className="flex items-center gap-3">

                  <div className="flex h-11 items-center gap-3 border border-black/20 px-4">

                    <span className="text-[10px] font-bold tracking-[0.15em]">
                      RADIUS
                    </span>

                    <select
                      value={radius}
                      onChange={(event) =>
                        setRadius(Number(event.target.value))
                      }
                      className="bg-transparent text-xs font-bold outline-none"
                    >
                      <option value={2}>2 KM</option>
                      <option value={5}>5 KM</option>
                      <option value={10}>10 KM</option>
                      <option value={25}>25 KM</option>
                    </select>

                  </div>

                  <div className="border border-black/20 px-4 py-3">

                    <span className="text-[10px] font-bold tracking-[0.15em]">
                      {visibleWells.length} WELLS
                    </span>

                  </div>

                </div>

              </div>


              {/* Map */}

              <div className="relative h-[620px] overflow-hidden border border-black/15 bg-[#111]">

                <div
                  className="absolute inset-0 transition-transform duration-300"
                  style={{
                    transform: `scale(${zoom})`,
                    backgroundImage: `
                      radial-gradient(
                        rgba(255,255,255,0.35) 1px,
                        transparent 1px
                      )
                    `,
                    backgroundSize: '28px 28px',
                  }}
                />


                {/* Radius */}

                <div
                  className="absolute rounded-full border border-[#FDB813]/40 bg-[#FDB813]/5 transition-all duration-300"
                  style={{
                    width: `${Math.min(radius * 45, 480)}px`,
                    height: `${Math.min(radius * 45, 480)}px`,
                    left: `${activeWell.x}%`,
                    top: `${activeWell.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />


                {/* Map information */}

                <div className="absolute left-5 top-5 z-10">

                  <p className="text-[10px] tracking-[0.2em] text-white/30">
                    EXPLORE MODE
                  </p>

                  <p className="mt-2 text-xs font-semibold tracking-widest text-white">
                    {activeWell.id}
                  </p>

                </div>


                <div className="absolute bottom-5 left-5 z-10 text-[10px] tracking-[0.15em] text-white/30">
                  VOLVE FIELD · NORWAY
                </div>


                {/* Well markers */}

                {visibleWells.map((well) => {

                  const isActive = well.id === activeWell.id
                  const isRisk = well.status === 'risk'

                  return (
                    <button
                      key={well.id}
                      type="button"
                      onClick={() => setSelectedWell(well)}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${well.x}%`,
                        top: `${well.y}%`,
                      }}
                    >

                      {isActive && (
                        <>
                          <span className="absolute -inset-7 rounded-full bg-white/10 blur-xl" />

                          <span className="absolute -inset-4 rounded-full border border-[#FDB813]/40" />
                        </>
                      )}

                      <span
                        className={`relative block h-5 w-5 rounded-full border-2 ${
                          isActive
                            ? 'border-[#FDB813] bg-white shadow-[0_0_25px_rgba(255,255,255,0.9)]'
                            : isRisk
                              ? 'border-red-400 bg-red-500'
                              : 'border-[#FDB813] bg-[#FDB813]'
                        }`}
                      />

                      <span
                        className={`absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-bold tracking-widest ${
                          isRisk
                            ? 'text-red-400'
                            : 'text-white'
                        }`}
                      >
                        {well.id}
                      </span>

                      {well.alert && (
                        <span className="absolute -top-9 left-7 whitespace-nowrap text-[9px] font-bold tracking-widest text-red-400">
                          ⚠ ALERT
                        </span>
                      )}

                    </button>
                  )
                })}


                {/* Selected well information */}

                {selectedWell && (
                  <div className="absolute bottom-6 left-6 z-20 w-80 border border-white/15 bg-black/90 p-5 text-white backdrop-blur-md">

                    <div className="mb-5 flex items-start justify-between">

                      <div>

                        <p className="text-[10px] tracking-[0.2em] text-white/40">
                          SELECTED WELL
                        </p>

                        <h2 className="mt-1 text-xl font-bold">
                          {selectedWell.id}
                        </h2>

                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedWell(null)}
                        className="text-xl text-white/40 hover:text-white"
                      >
                        ×
                      </button>

                    </div>


                    <div className="grid grid-cols-2 gap-4 text-xs">

                      <div>
                        <p className="text-white/40">
                          DISTANCE
                        </p>

                        <p className="mt-1 font-semibold">
                          {selectedWell.id === activeWell.id
                            ? 'ACTIVE'
                            : `${selectedWell.distance} km`}
                        </p>
                      </div>

                      <div>
                        <p className="text-white/40">
                          DEPTH
                        </p>

                        <p className="mt-1 font-semibold">
                          {selectedWell.depth} m
                        </p>
                      </div>

                      <div>
                        <p className="text-white/40">
                          FORMATION
                        </p>

                        <p className="mt-1 font-semibold">
                          {selectedWell.formation}
                        </p>
                      </div>

                      <div>
                        <p className="text-white/40">
                          STATUS
                        </p>

                        <p
                          className={`mt-1 font-semibold ${
                            selectedWell.status === 'risk'
                              ? 'text-red-400'
                              : selectedWell.id === activeWell.id
                                ? 'text-[#FDB813]'
                                : 'text-white'
                          }`}
                        >
                          {selectedWell.id === activeWell.id
                            ? 'ACTIVE'
                            : selectedWell.status.toUpperCase()}
                        </p>
                      </div>

                    </div>


                    {selectedWell.alert && (
                      <div className="mt-5 border-t border-white/10 pt-4">

                        <p className="text-[10px] font-bold tracking-widest text-red-400">
                          ALERT
                        </p>

                        <p className="mt-1 text-sm">
                          {selectedWell.alert}
                        </p>

                      </div>
                    )}


                    {selectedWell.event && (
                      <div className="mt-4">

                        <p className="text-[10px] tracking-widest text-white/40">
                          HISTORICAL EVENT
                        </p>

                        <p className="mt-1 text-sm">
                          {selectedWell.event}
                        </p>

                      </div>
                    )}

                  </div>
                )}


                {/* Zoom */}

                <div className="absolute right-5 top-5 z-20 flex flex-col border border-white/15 bg-black/70">

                  <button
                    type="button"
                    onClick={() =>
                      setZoom((current) =>
                        Math.min(current + 0.2, 2),
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center text-xl text-white hover:bg-white hover:text-black"
                  >
                    +
                  </button>

                  <div className="h-px bg-white/10" />

                  <button
                    type="button"
                    onClick={() =>
                      setZoom((current) =>
                        Math.max(current - 0.2, 0.6),
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center text-xl text-white hover:bg-white hover:text-black"
                  >
                    −
                  </button>

                </div>

              </div>


              {/* Legend */}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-4">

                <div className="flex items-center gap-6 text-[10px] font-semibold tracking-[0.15em]">

                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-white ring-2 ring-[#FDB813]" />
                    ACTIVE
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#FDB813]" />
                    NORMAL
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    RISK / EVENT
                  </div>

                </div>

                <p className="text-[10px] tracking-[0.12em] text-black/40">
                  SELECT A WELL ON THE MAP TO EXPLORE
                </p>

              </div>

            </>
          )}

        </div>

      </section>

    </main>
  )
}

export default Explore