import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { wells, type Well } from '../../data/wells'
import WellMap from '../../components/WellMap'
import { useAuth } from '../../context/AuthContext'

function Explore() {
  const { user } = useAuth();
  // Default to 15/9-F-7 matching photo 1
  const [activeWell, setActiveWell] = useState<Well | null>(wells[1])
  const [search, setSearch] = useState('')
  const [showWellList, setShowWellList] = useState(false)
  const [radius, setRadius] = useState(5)
  const [selectedWell, setSelectedWell] = useState<Well | null>(null)

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
    setSelectedWell(well)
    setSearch(well.id)
    setShowWellList(false)
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] text-black font-average">

      {/* Navigation */}

      <nav className="flex h-20 items-center justify-between border-b border-black/10 bg-[#ffdd47] px-8 text-black">

        <Link
          to="/workspace"
          className="text-2xl font-extrabold tracking-tight text-black"
        >
          NWIS
        </Link>

        <div className="flex items-center gap-10 text-xs font-bold tracking-[0.15em] text-black">

          <Link
            to="/explore"
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

        {/* Standardized User Profile Pill */}
        <div className="flex items-center gap-3 bg-black/10 px-3.5 py-1.5 rounded-full border border-black/15">
          <div className="w-8 h-8 rounded-full bg-black text-[#FDB813] flex items-center justify-center font-extrabold text-sm shadow-xs">
            {(user?.email || 'nsrivatsa084@gmail.com').charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block text-left pr-1">
            <p className="text-xs font-bold text-black leading-none">{user?.email || 'nsrivatsa084@gmail.com'}</p>
            <p className="text-[9px] text-black/60 font-semibold mt-0.5">{user?.role || 'Lead Drilling Engineer'}</p>
          </div>
        </div>

      </nav>


      {/* Main */}

      <section className="px-8 md:px-12 pb-16 pt-12 max-w-[1500px] w-full mx-auto">

        <div className="w-full">

          {/* Header */}

          <div className="mb-10 text-center">

            <p className="mb-2 text-xs font-bold tracking-[0.25em] text-black/40">
              EXPLORE
            </p>

            <h1 className="text-6xl font-bold tracking-[-0.04em]">
              WELLS
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-xs leading-6 text-black/45">
              Explore wells surrounding the active well and identify nearby drilling intelligence.
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

                  <div className="flex h-11 items-center gap-3 border border-black/20 bg-white px-4">

                    <span className="text-[10px] font-bold tracking-[0.15em]">
                      RADIUS
                    </span>

                    <select
                      value={radius}
                      onChange={(event) =>
                        setRadius(Number(event.target.value))
                      }
                      className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value={2}>2 KM</option>
                      <option value={5}>5 KM</option>
                      <option value={10}>10 KM</option>
                      <option value={25}>25 KM</option>
                    </select>

                  </div>

                  <div className="border border-black/20 bg-white px-4 py-3">

                    <span className="text-[10px] font-bold tracking-[0.15em]">
                      {visibleWells.length} WELLS
                    </span>

                  </div>

                </div>

              </div>


              {/* GOOGLE MAPS COMPONENT */}

              <div className="relative h-[620px] overflow-hidden border border-black/15 bg-[#111]">
                <WellMap
                  activeWell={activeWell}
                  visibleWells={visibleWells}
                  selectedWell={selectedWell}
                  radiusKM={radius}
                  onSelectWell={setSelectedWell}
                />
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