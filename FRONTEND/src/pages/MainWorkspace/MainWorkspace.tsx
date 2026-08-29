import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { wells, type Well } from '../../data/wells'
import WellMap from '../../components/WellMap'

function MainWorkspace() {
  const [activeWell, setActiveWell] = useState<Well | null>(null)
  const [search, setSearch] = useState('')
  const [showWellList, setShowWellList] = useState(false)
  const [radius, setRadius] = useState(5)
  const [selectedWell, setSelectedWell] = useState<Well | null>(null)

  const [mapZoom, setMapZoom] = useState(1)

  const [cursorPosition, setCursorPosition] = useState({
    x: 50,
    y: 50,
  })

  const filteredWells = useMemo(() => {
    if (!search.trim()) {
      return wells
    }

    return wells.filter((well) =>
      well.id.toLowerCase().includes(search.toLowerCase()),
    )
  }, [search])

  const visibleWells = useMemo(() => {
  if (!activeWell) {
    return []
  }

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

      // Convert the relative map position into a prototype distance.
      const distance = Math.sqrt(dx * dx + dy * dy) / 10

      return {
        ...well,
        distance: Number(distance.toFixed(1)),
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
    setMapZoom(1)
  }

  const handleZoomIn = () => {
    setMapZoom((current) => Math.min(current + 0.2, 2))
  }

  const handleZoomOut = () => {
    setMapZoom((current) => Math.max(current - 0.2, 0.6))
  }

  const handleMapMouseMove = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    const rect = event.currentTarget.getBoundingClientRect()

    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100

    setCursorPosition({ x, y })
  }

  return (
    <main className="min-h-screen bg-white text-black">

      {/* ================= NAVIGATION ================= */}

      <nav className="flex h-20 items-center justify-between border-b border-black/12 bg-[#ffdd47] px-8">

        <Link
          to="/workspace"
          className="text-xl font-bold tracking-tight"
        >
          NWIS
        </Link>

        <div className="flex items-center gap-10 text-xs font-semibold tracking-[0.15em]">

          <Link
            to="/explore"
            className="border-b-2 border-black pb-1 transition hover:text-[#FDB813]"
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


      {/* ================= MAIN ================= */}

      <section className="px-8 pb-10 pt-12">

        <div className="mx-auto max-w-7xl">


          {/* ================= CENTERED HEADER ================= */}

          <div className="mb-10 flex flex-col items-center text-center">

            <p className="mb-2 text-xs font-semibold tracking-[0.25em] text-black/40">
              NEARBY WELLS INTELLIGENCE SYSTEM
            </p>

            <h1 className="text-6xl font-bold tracking-[-0.04em]">
              NWIS
            </h1>

          </div>


          {/* ================= CENTERED WELL SEARCH ================= */}

          <div className="relative mb-8 flex justify-center">

            <div className="w-full max-w-xl">

              <label
                htmlFor="well-search"
                className="mb-2 block text-center text-[10px] font-bold tracking-[0.2em] text-black/50"
              >
                SELECT ACTIVE WELL
              </label>

              <input
                id="well-search"
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


              {/* Well selection dropdown */}

              {showWellList && (
                <div className="absolute left-1/2 top-[78px] z-30 w-full max-w-xl -translate-x-1/2 border border-black/15 bg-white text-left shadow-lg">

                  <div className="border-b border-black/10 px-5 py-3">

                    <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                      AVAILABLE WELLS
                    </p>

                  </div>


                  {filteredWells.length > 0 ? (
                    filteredWells.map((well) => (

                      <button
                        key={well.id}
                        type="button"
                        onClick={() => handleSelectWell(well)}
                        className="flex w-full items-center justify-between border-b border-black/10 px-5 py-4 text-left transition last:border-b-0 hover:bg-black hover:text-white"
                      >

                        <div>

                          <p className="text-sm font-bold tracking-wide">
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
                          {well.landmass}
                        </span>

                      </button>

                    ))
                  ) : (
                    <div className="px-5 py-5 text-xs text-black/50">
                      No matching well found.
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>


          {/* ================= BEFORE WELL SELECTION ================= */}

          {!activeWell && (
            <div
              className="relative flex min-h-[520px] items-center justify-center overflow-hidden border border-black/10"
              onMouseMove={handleMapMouseMove}
              style={{
                backgroundImage: `
                  radial-gradient(
                    circle at ${cursorPosition.x}% ${cursorPosition.y}%,
                    rgba(253,184,19,0.07),
                    transparent 180px
                  ),
                  radial-gradient(
                    rgba(0,0,0,0.12) 1px,
                    transparent 1px
                  )
                `,
                backgroundSize: '100% 100%, 18px 18px',
              }}
            >

              <div className="relative z-10 text-center">

                <div className="mx-auto mb-5 h-3 w-3 rounded-full bg-[#FDB813]" />

                <p className="text-xs font-bold tracking-[0.25em]">
                  SELECT A WELL TO BEGIN
                </p>

                <p className="mt-3 text-xs text-black/40">
                  Enter or select a Well ID above to view nearby wells.
                </p>

              </div>

            </div>
          )}


          {/* ================= ACTIVE WELL WORKSPACE ================= */}

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

                  {/* Radius */}

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


                  {/* LANDMASS */}

                  <div className="flex h-11 items-center gap-3 border border-black/20 px-4">

                    <span className="text-[10px] font-bold tracking-[0.15em]">
                      LANDMASS
                    </span>

                    <span className="text-xs font-bold text-[#FDB813]">
                      {activeWell.landmass}
                    </span>

                  </div>

                </div>

              </div>


              {/* ================= MAP ================= */}

              <div className="relative h-[620px] overflow-hidden border border-black/15">
  <WellMap
    activeWell={activeWell}
    visibleWells={visibleWells}
    selectedWell={selectedWell}
    radiusKM={radius}
    onSelectWell={setSelectedWell}
  />
</div>

              {/* ================= MAP LEGEND ================= */}

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
                  {visibleWells.length} WELLS WITHIN {radius} KM
                </p>

              </div>

            </>
          )}

        </div>

      </section>

    </main>
  )
}

export default MainWorkspace