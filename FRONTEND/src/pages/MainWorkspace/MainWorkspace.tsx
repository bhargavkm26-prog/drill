import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { wells, type Well } from '../../data/wells'
import WellMap from '../../components/WellMap'
import { useAuth } from '../../context/AuthContext'

function MainWorkspace() {
  const { user } = useAuth()

  const [activeWell, setActiveWell] = useState<Well | null>(null)
  const [search, setSearch] = useState('')
  const [showWellList, setShowWellList] = useState(false)
  const [radius, setRadius] = useState(5)
  const [selectedWell, setSelectedWell] = useState<Well | null>(null)

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
    <main className="min-h-screen w-full bg-[#f5f5f2] text-black">

      {/* ================= NAVIGATION ================= */}

      <nav className="flex h-20 w-full items-center justify-between border-b border-black/10 bg-[#ffdd47] px-8 text-black">

        <Link
          to="/workspace"
          className="text-2xl font-extrabold tracking-tight text-black"
        >
          NWIS
        </Link>

        <div className="flex items-center gap-10 text-xs font-bold tracking-[0.15em] text-black">

          <Link
            to="/workspace"
            className="border-b-2 border-black pb-1 transition hover:text-[#b78600]"
          >
            EXPLORE
          </Link>

          <Link
            to="/monitor"
            className="transition hover:text-[#b78600]"
          >
            MONITOR / ALERTS
          </Link>

          <Link
            to="/investigate"
            className="transition hover:text-[#b78600]"
          >
            INVESTIGATE
          </Link>

        </div>

        {/* User Profile */}

        <div className="flex items-center gap-3 rounded-full border border-black/15 bg-black/10 px-3.5 py-1.5">

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-extrabold text-[#FDB813] shadow-sm">
            {(user?.email || 'nsrivatsa084@gmail.com')
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="hidden pr-1 text-left sm:block">
            <p className="text-xs font-bold leading-none text-black">
              {user?.email || 'nsrivatsa084@gmail.com'}
            </p>

            <p className="mt-0.5 text-[9px] font-semibold text-black/60">
              {user?.role || 'Lead Drilling Engineer'}
            </p>
          </div>

        </div>

      </nav>


      {/* ================= MAIN CONTENT ================= */}

      <section
        style={{
          width: 'calc(100% - 96px)',
          maxWidth: '1500px',
          marginLeft: 'auto',
          marginRight: 'auto',
          boxSizing: 'border-box',
        }}
        className="pb-16 pt-12"
      >

        {/* ================= HEADER ================= */}

        <div className="mb-7 flex flex-col items-center text-center">

          <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-black/50">
            NEARBY WELLS INTELLIGENCE SYSTEM
          </p>

          <h1 className="text-6xl font-bold leading-none tracking-[-0.04em] drop-shadow-[0_2px_3px_rgba(0,0,0,0.15)]">
            NWIS
          </h1>

        </div>


        {/* ================= WELL SEARCH ================= */}

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
              className="h-14 w-full border border-black/15 bg-white px-5 text-center text-sm font-semibold tracking-[0.08em] shadow-[0_4px_14px_rgba(0,0,0,0.08)] outline-none transition focus:border-[#FDB813]"
            />


            {/* ================= WELL DROPDOWN ================= */}

            {showWellList && (
              <div className="absolute left-1/2 top-[78px] z-30 w-full max-w-xl -translate-x-1/2 overflow-hidden border border-black/10 bg-white text-left shadow-[0_10px_30px_rgba(0,0,0,0.12)]">

                <div className="border-b border-black/10 px-6 py-3">

                  <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                    AVAILABLE WELLS
                  </p>

                </div>


                {filteredWells.length > 0 ? (
                  filteredWells.map((well) => {

                    const isRisk =
                      well.status === 'risk' ||
                      well.status === 'lost' ||
                      !!well.alert

                    return (
                      <button
                        key={well.id}
                        type="button"
                        onClick={() => handleSelectWell(well)}
                        className="flex min-h-[72px] w-full items-center justify-between border-b border-black/10 px-6 py-4 text-left transition-all last:border-b-0 hover:bg-black hover:text-white"
                      >

                        <div>

                          <p className="text-sm font-bold tracking-[0.08em]">
                            {well.id}
                          </p>

                          <p className="mt-1 text-[10px] tracking-[0.15em] opacity-50">
                            {well.formation} · {well.depth} m
                          </p>

                        </div>


                        <span
                          className={`text-[9px] font-bold tracking-[0.2em] ${
                            isRisk
                              ? 'text-red-500'
                              : 'text-[#FDB813]'
                          }`}
                        >
                          {well.landmass}
                        </span>

                      </button>
                    )
                  })
                ) : (
                  <div className="px-6 py-5 text-xs text-black/50">
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
            className="relative flex min-h-[520px] w-full items-center justify-center overflow-hidden border border-black/10 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
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

              <div className="mx-auto mb-5 h-3 w-3 rounded-full bg-[#FDB813] shadow-[0_0_12px_rgba(253,184,19,0.35)]" />

              <p className="text-xs font-bold tracking-[0.25em]">
                SELECT A WELL TO BEGIN
              </p>

              <p className="mt-3 text-xs text-black/45">
                Enter or select a Well ID above to view nearby wells.
              </p>

            </div>

          </div>
        )}


        {/* ================= ACTIVE WELL WORKSPACE ================= */}

        {activeWell && (
          <>

            {/* ================= CONTROLS ================= */}

            <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-4">

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

                <div className="flex h-11 items-center gap-3 border border-black/10 bg-white px-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">

                  <span className="text-[10px] font-bold tracking-[0.15em]">
                    RADIUS
                  </span>

                  <select
                    value={radius}
                    onChange={(event) =>
                      setRadius(Number(event.target.value))
                    }
                    className="cursor-pointer bg-transparent text-xs font-bold outline-none"
                  >
                    <option value={2}>2 KM</option>
                    <option value={5}>5 KM</option>
                    <option value={10}>10 KM</option>
                    <option value={25}>25 KM</option>
                  </select>

                </div>


                {/* Landmass */}

                <div className="flex h-11 items-center gap-3 border border-black/10 bg-white px-4 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">

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

            <div className="relative h-[620px] w-full overflow-hidden border border-black/10 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.08)]">

              <WellMap
                activeWell={activeWell}
                visibleWells={visibleWells}
                selectedWell={selectedWell}
                radiusKM={radius}
                onSelectWell={setSelectedWell}
              />

            </div>


            {/* ================= MAP LEGEND ================= */}

            <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-4">

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

      </section>

    </main>
  )
}

export default MainWorkspace