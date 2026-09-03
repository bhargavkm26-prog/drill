import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Well } from '../../data/wells' // Still importing the type for now
import WellMap from '../../components/WellMap'
import { useAuth } from '../../context/AuthContext'
import { wellDataService } from '../../services/wellDataService'

function MainWorkspace() {
  const { user } = useAuth()

  const [wells, setWells] = useState<Well[]>([])
  const [activeWell, setActiveWell] = useState<Well | null>(null)
  const [search, setSearch] = useState('')
  const [showWellList, setShowWellList] = useState(false)
  const [radius, setRadius] = useState(5)
  const [selectedWell, setSelectedWell] = useState<Well | null>(null)

  const [showRegisterWellModal, setShowRegisterWellModal] = useState(false)
  const [newWellData, setNewWellData] = useState({
    well_name: '',
    latitude: 27.5,
    longitude: 95.3,
    target_depth_m: 3000,
    basin: 'Upper Assam',
    status: 'ACTIVE'
  })
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    async function fetchWells() {
      try {
        const apiWells = await wellDataService.listWells()
        // Map API data to the frontend Well format
        const mappedWells: Well[] = apiWells.map((w: any) => ({
          id: w.well_name,
          name: w.well_name,
          distance: 0,
          depth: w.target_depth_m || 3000,
          formation: w.basin || 'Unknown Basin',
          status: (w.status === 'Drilling' ? 'normal' : 'normal') as any,
          landmass: 'LAND' as any,
          location: { lat: w.latitude || 27.5, lng: w.longitude || 95.3 },
          x: 0,
          y: 0
        }))
        setWells(mappedWells)
      } catch (err) {
        console.error("Failed to fetch wells:", err)
      }
    }
    fetchWells()
  }, [])

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
  }, [search, wells])

  const [visibleWells, setVisibleWells] = useState<Well[]>([])

  const handleRegisterWell = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      await wellDataService.registerWell(newWellData);
      // Refresh wells
      const apiWells = await wellDataService.listWells();
      const mappedWells: Well[] = apiWells.map((w: any) => ({
        id: w.well_name,
        name: w.well_name,
        distance: 0,
        depth: w.target_depth_m || 3000,
        formation: w.basin || 'Unknown Basin',
        status: (w.status === 'Drilling' ? 'normal' : 'normal') as any,
        landmass: 'LAND' as any,
        location: { lat: w.latitude || 27.5, lng: w.longitude || 95.3 },
        x: 0,
        y: 0
      }));
      setWells(mappedWells);
      setShowRegisterWellModal(false);
      setNewWellData({ well_name: '', latitude: 27.5, longitude: 95.3, target_depth_m: 3000, basin: 'Upper Assam', status: 'ACTIVE' });
    } catch (err) {
      console.error("Failed to register well:", err);
      alert("Failed to register well. Check console.");
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    async function loadNearby() {
      if (!activeWell) {
        setVisibleWells([])
        return
      }
      try {
        const nearbyData = await wellDataService.findNearbyWells(activeWell.location.lat, activeWell.location.lng, radius)
        if (nearbyData && Array.isArray(nearbyData)) {
          const mappedNearby = nearbyData.map((w: any) => ({
            id: w.well_name || w.wellId || w.id,
            name: w.well_name || w.wellId || w.name,
            distance: w.distance_km || 0,
            depth: w.target_depth_m || w.depth || 3000,
            formation: w.basin || w.formation || 'Unknown Basin',
            status: 'normal' as any,
            landmass: 'LAND' as any,
            location: { lat: w.latitude || w.lat || 27.5, lng: w.longitude || w.lng || 95.3 },
            x: 0,
            y: 0
          }))
          setVisibleWells(mappedNearby)
        }
      } catch (err) {
        console.error("Failed to fetch nearby wells:", err)
        setVisibleWells([activeWell])
      }
    }
    loadNearby()
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
    <>
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

        <div className="relative mb-8 flex flex-col items-center">

          <button 
            onClick={() => setShowRegisterWellModal(true)}
            className="mb-4 px-6 py-3 rounded-full bg-black text-white text-xs font-bold tracking-widest hover:bg-[#FDB813] hover:text-black transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-[#FDB813]/50">
            + REGISTER NEW WELL
          </button>

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

                  <input
                    type="number"
                    value={radius}
                    onChange={(event) => setRadius(Number(event.target.value) || 0)}
                    className="w-16 bg-transparent text-xs font-bold outline-none"
                    min="1"
                    step="any"
                    list="radius-options"
                  />
                  <span className="text-[10px] font-bold text-gray-400 -ml-2">KM</span>
                  <datalist id="radius-options">
                    <option value="2" />
                    <option value="5" />
                    <option value="10" />
                    <option value="25" />
                  </datalist>

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

    {showRegisterWellModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-300">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform transition-transform duration-300 scale-100">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">
            Register New Well
          </h2>
          <form onSubmit={handleRegisterWell} className="flex flex-col gap-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Well Name</label>
              <input required type="text" value={newWellData.well_name} onChange={e => setNewWellData({...newWellData, well_name: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Latitude</label>
                <input required type="number" step="any" value={newWellData.latitude} onChange={e => setNewWellData({...newWellData, latitude: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Longitude</label>
                <input required type="number" step="any" value={newWellData.longitude} onChange={e => setNewWellData({...newWellData, longitude: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Target Depth (m)</label>
              <input required type="number" step="any" value={newWellData.target_depth_m} onChange={e => setNewWellData({...newWellData, target_depth_m: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Basin</label>
              <input required type="text" value={newWellData.basin} onChange={e => setNewWellData({...newWellData, basin: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
            </div>
            <div className="mt-4 flex gap-4">
              <button type="button" onClick={() => setShowRegisterWellModal(false)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95">
                Cancel
              </button>
              <button type="submit" disabled={isRegistering} className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all hover:bg-[#FDB813] hover:text-black hover:shadow-lg active:scale-95">
                {isRegistering ? 'Registering...' : 'Register Well'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}

export default MainWorkspace