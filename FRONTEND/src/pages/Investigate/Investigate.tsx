import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Well } from '../../data/wells'
import { useAuth } from '../../context/AuthContext'
import { wellDataService } from '../../services/wellDataService'

type Comparison = {
  well: Well
  depthDifference: number
  distance: number
  statusMatch: boolean
  eventPresent: boolean
}

function Investigate() {
  const { user } = useAuth()

  const [wells, setWells] = useState<Well[]>([])
  const [selectedWellId, setSelectedWellId] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const apiWells = await wellDataService.listWells()
        const mappedWells = apiWells.map((w: any) => ({
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
        if (mappedWells.length > 0) {
            setSelectedWellId(mappedWells[0].id)
        }
      } catch (err) {
        console.error("Error loading Investigate data:", err)
      }
    }
    loadData()
  }, [])

  const selectedWell = useMemo(
    () =>
      wells.find((well) => well.id === selectedWellId) ??
      wells[0],
    [selectedWellId, wells],
  )

  const [comparisons, setComparisons] = useState<Comparison[]>([])

  const [showLogIncidentModal, setShowLogIncidentModal] = useState(false);
  const [incidentData, setIncidentData] = useState({
    well_name: '',
    depth_m: 0,
    formation_name: '',
    incident_type: 'Stuck Pipe',
    severity: 'Medium',
    npt_hours: 0,
    mitigation_sop: ''
  });
  const [isLoggingIncident, setIsLoggingIncident] = useState(false);

  const [showCorrelateModal, setShowCorrelateModal] = useState(false);
  const [correlateFormation, setCorrelateFormation] = useState('');
  const [isCorrelating, setIsCorrelating] = useState(false);
  const [correlateResults, setCorrelateResults] = useState<any>(null);

  const handleLogIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIncident(true);
    try {
      const { incidentService } = await import('../../services/incidentService');
      await incidentService.logIncident(incidentData);
      alert('Incident logged successfully!');
      setShowLogIncidentModal(false);
      setIncidentData({ well_name: '', depth_m: 0, formation_name: '', incident_type: 'Stuck Pipe', severity: 'Medium', npt_hours: 0, mitigation_sop: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to log incident.');
    } finally {
      setIsLoggingIncident(false);
    }
  };

  const handleCorrelate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCorrelating(true);
    setCorrelateResults(null);
    try {
      const { correlationService } = await import('../../services/correlationService');
      const results = await correlationService.correlateFormations(correlateFormation);
      setCorrelateResults(results);
    } catch (err) {
      console.error(err);
      alert('Correlation failed.');
    } finally {
      setIsCorrelating(false);
    }
  };

  useEffect(() => {
    async function loadCorrelation() {
      if (!selectedWell) {
        setComparisons([])
        return
      }
      try {
        const { correlationService } = await import('../../services/correlationService')
        const correlationData = await correlationService.getWellCorrelation(selectedWell.id)
        
        if (correlationData && correlationData.comparisons) {
          const mappedComparisons = correlationData.comparisons.map((c: any) => ({
            well: wells.find(w => w.id === c.wellId) || { ...wells[0], id: c.wellId, name: c.wellId },
            depthDifference: c.depthDifferenceM || 0,
            distance: c.distanceKm || 0,
            statusMatch: c.statusRelation === 'MATCH',
            eventPresent: c.eventData === 'PRESENT',
            correlationScore: c.correlationScore
          }))
          setComparisons(mappedComparisons)
        }
      } catch (err) {
        console.error("Failed to fetch correlation data:", err)
        // Fallback for UI visualization if API missing/fails
        const fallbackComparisons = wells
          .filter((well) => well.id !== selectedWell.id)
          .map((well) => ({
            well,
            depthDifference: Math.abs(Number(well.depth) - Number(selectedWell.depth)),
            distance: Number(well.distance ?? 0),
            statusMatch: well.status === selectedWell.status,
            eventPresent: Boolean(well.alert || well.event),
          }))
        setComparisons(fallbackComparisons)
      }
    }
    loadCorrelation()
  }, [selectedWell, wells])

  if (!selectedWell) {
    return null
  }

  return (
    <main className="min-h-screen w-full bg-[#f5f5f2] text-black">

      {/* =========================================================
          NAVIGATION
      ========================================================= */}

      <nav className="flex h-20 w-full items-center justify-between border-b border-black/10 bg-[#ffdd47] px-8 text-black shadow-[0_2px_10px_rgba(0,0,0,0.06)]">

        <Link
          to="/workspace"
          className="text-2xl font-extrabold tracking-tight text-black"
        >
          NWIS
        </Link>

        <div className="flex items-center gap-10 text-xs font-bold tracking-[0.15em] text-black">

          <Link
            to="/workspace"
            className="transition hover:text-[#b78600]"
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
            className="border-b-2 border-black pb-1 transition hover:text-[#b78600]"
          >
            INVESTIGATE
          </Link>

        </div>

        {/* USER PROFILE */}

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


      {/* =========================================================
          PAGE CONTENT
      ========================================================= */}

      <section
        style={{
          width: 'calc(100% - 96px)',
          maxWidth: '1500px',
          marginLeft: 'auto',
          marginRight: 'auto',
          boxSizing: 'border-box',
        }}
        className="pb-20 pt-12"
      >

        {/* =======================================================
            HEADER
        ======================================================= */}

        <div className="mb-12">

          <div className="flex flex-wrap items-end justify-between gap-10">

            <div>

              <p className="mb-4 text-[10px] font-bold tracking-[0.25em] text-black/45">
                INVESTIGATION
              </p>

              <h1 className="text-6xl font-extrabold leading-none tracking-[-0.05em] drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)] md:text-7xl">
                CORRELATION
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-black/50">
                Compare the selected well against nearby wells to identify
                related drilling conditions, events, and trajectory
                characteristics.
              </p>

            </div>


            {/* =================================================
                WELL SELECTOR
            ================================================= */}

            <div className="w-full sm:w-72">

              <label
                htmlFor="investigate-well"
                className="mb-2 block text-[9px] font-bold tracking-[0.2em] text-black/45"
              >
                SELECT REFERENCE WELL
              </label>

              <select
                id="investigate-well"
                value={selectedWell.id}
                onChange={(event) =>
                  setSelectedWellId(event.target.value)
                }
                className="h-13 w-full cursor-pointer border border-black/10 bg-white px-4 text-sm font-bold tracking-wider shadow-[0_5px_16px_rgba(0,0,0,0.08)] outline-none transition hover:border-black/25 focus:border-[#FDB813] focus:shadow-[0_6px_18px_rgba(253,184,19,0.12)]"
              >
                {wells.map((well) => (
                  <option key={well.id} value={well.id}>
                    {well.id}
                  </option>
                ))}
              </select>

              <div className="flex flex-col gap-3 mt-6 sm:mt-0">
                <button onClick={() => setShowLogIncidentModal(true)} className="flex-1 rounded-xl bg-[#FDB813] text-black text-sm font-bold py-3 px-6 hover:bg-black hover:text-[#FDB813] transition-all hover:scale-105 active:scale-95 shadow-md">
                  + Log Incident
                </button>
                <button onClick={() => setShowCorrelateModal(true)} className="flex-1 rounded-xl bg-white border border-gray-200 text-black text-sm font-bold py-3 px-6 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-sm">
                  Correlate
                </button>
              </div>

            </div>

          </div>

        </div>


        {/* =======================================================
            REFERENCE WELL
        ======================================================= */}

        <section className="mb-12 overflow-hidden border border-black/10 bg-white shadow-[0_7px_22px_rgba(0,0,0,0.07)]">

          <div className="flex min-h-[120px] flex-wrap items-center justify-between gap-8 px-8 py-7">

            {/* WELL ID */}

            <div className="flex items-center gap-4">

              <span className="h-3.5 w-3.5 rounded-full bg-white ring-2 ring-[#FDB813] shadow-[0_0_10px_rgba(253,184,19,0.3)]" />

              <div>

                <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                  REFERENCE WELL
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-wider">
                  {selectedWell.id}
                </h2>

              </div>

            </div>


            {/* WELL METADATA */}

            <div className="flex flex-wrap gap-12">

              <div>
                <p className="text-[9px] font-bold tracking-widest text-black/40">
                  DEPTH
                </p>

                <p className="mt-2 text-sm font-bold">
                  {selectedWell.depth} m
                </p>
              </div>


              <div>
                <p className="text-[9px] font-bold tracking-widest text-black/40">
                  LANDMASS
                </p>

                <p className="mt-2 text-sm font-bold uppercase">
                  {selectedWell.landmass}
                </p>
              </div>


              <div>
                <p className="text-[9px] font-bold tracking-widest text-black/40">
                  STATUS
                </p>

                <p
                  className={`mt-2 text-sm font-bold uppercase ${
                    selectedWell.status === 'risk' ||
                    selectedWell.status === 'lost'
                      ? 'text-red-500'
                      : 'text-[#b78600]'
                  }`}
                >
                  {selectedWell.status}
                </p>
              </div>

            </div>

          </div>

        </section>


        {/* =======================================================
            CROSS WELL ANALYSIS
        ======================================================= */}

        <section>

          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">

            <div>

              <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                CROSS-WELL ANALYSIS
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Related Wells
              </h2>

            </div>

            <p className="text-[10px] font-semibold tracking-[0.15em] text-black/40">
              {comparisons.length} COMPARISONS
            </p>

          </div>


          {/* =====================================================
              COMPARISON CARDS
          ===================================================== */}

          <div className="space-y-7">

            {comparisons.map((comparison) => {

              const { well } = comparison

              const isRisk =
                well.status === 'risk' ||
                well.status === 'lost'

              return (
                <div
                  key={well.id}
                  className="overflow-hidden border border-black/10 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(0,0,0,0.09)]"
                >

                  {/* ===========================================
                      WELL HEADER
                  =========================================== */}

                  <div className="flex flex-wrap items-center justify-between gap-6 border-b border-black/10 px-8 py-6">

                    <div className="flex items-center gap-4">

                      <span
                        className={`h-3.5 w-3.5 rounded-full ${
                          isRisk
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.35)]'
                            : 'bg-[#FDB813] shadow-[0_0_8px_rgba(253,184,19,0.3)]'
                        }`}
                      />

                      <div>

                        <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                          COMPARISON WELL
                        </p>

                        <h3 className="mt-2 text-lg font-bold tracking-wider">
                          {well.id}
                        </h3>

                      </div>

                    </div>


                    <Link
                      to={`/wells/${encodeURIComponent(well.id)}`}
                      className="border border-black/10 bg-black px-4 py-2.5 text-[9px] font-bold tracking-[0.15em] text-white shadow-[0_4px_10px_rgba(0,0,0,0.12)] transition hover:bg-[#FDB813] hover:text-black hover:shadow-[0_5px_14px_rgba(253,184,19,0.2)]"
                    >
                      VIEW WELL →
                    </Link>

                  </div>


                  {/* ===========================================
                      METRICS
                  =========================================== */}

                  <div className="grid border-b border-black/10 sm:grid-cols-2 lg:grid-cols-4">

                    {/* DISTANCE */}

                    <div className="min-h-[125px] border-b border-black/10 px-7 py-6 sm:border-r lg:border-b-0">

                      <p className="text-[9px] font-bold tracking-widest text-black/40">
                        DISTANCE
                      </p>

                      <p className="mt-4 text-2xl font-bold">
                        {comparison.distance}
                        <span className="ml-1 text-xs font-semibold text-black/40">
                          km
                        </span>
                      </p>

                    </div>


                    {/* DEPTH DIFFERENCE */}

                    <div className="min-h-[125px] border-b border-black/10 px-7 py-6 lg:border-b-0 lg:border-r">

                      <p className="text-[9px] font-bold tracking-widest text-black/40">
                        DEPTH DIFFERENCE
                      </p>

                      <p className="mt-4 text-2xl font-bold">
                        {comparison.depthDifference}
                        <span className="ml-1 text-xs font-semibold text-black/40">
                          m
                        </span>
                      </p>

                    </div>


                    {/* STATUS RELATION */}

                    <div className="min-h-[125px] border-b border-black/10 px-7 py-6 sm:border-r lg:border-b-0">

                      <p className="text-[9px] font-bold tracking-widest text-black/40">
                        STATUS RELATION
                      </p>

                      <p
                        className={`mt-4 text-base font-bold uppercase ${
                          comparison.statusMatch
                            ? 'text-[#b78600]'
                            : 'text-black'
                        }`}
                      >
                        {comparison.statusMatch
                          ? 'MATCH'
                          : 'DIFFERENT'}
                      </p>

                    </div>


                    {/* EVENT DATA */}

                    <div className="min-h-[125px] px-7 py-6">

                      <p className="text-[9px] font-bold tracking-widest text-black/40">
                        EVENT DATA
                      </p>

                      <p
                        className={`mt-4 text-base font-bold uppercase ${
                          comparison.eventPresent
                            ? 'text-red-500'
                            : 'text-black/45'
                        }`}
                      >
                        {comparison.eventPresent
                          ? 'PRESENT'
                          : 'NONE'}
                      </p>

                    </div>

                  </div>


                  {/* ===========================================
                      CORRELATION DATA
                  =========================================== */}

                  <div className="px-8 py-8">

                    <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-start">

                      <div className="max-w-3xl">

                        <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                          CORRELATION DATA
                        </p>

                        <h4 className="mt-2 text-lg font-bold">
                          Cross-well relationship
                        </h4>

                        <p className="mt-3 text-sm leading-6 text-black/55">
                          This well is being evaluated against{' '}
                          <span className="font-bold text-black">
                            {selectedWell.id}
                          </span>{' '}
                          using the currently available well metadata.
                          Deeper trajectory and time-series correlation
                          will be supplied by the drilling-data / ML
                          pipeline.
                        </p>

                      </div>


                      {/* ANALYSIS STATE */}

                      <div className="shrink-0 border border-[#FDB813] bg-[#FDB813]/10 px-6 py-4 shadow-[0_4px_12px_rgba(253,184,19,0.08)]">

                        <p className="text-[8px] font-bold tracking-[0.18em] text-black/50">
                          ANALYSIS STATE
                        </p>

                        <p className="mt-2 text-xs font-bold">
                          READY FOR ML CORRELATION
                        </p>

                      </div>

                    </div>

                  </div>

                </div>
              )
            })}

          </div>

        </section>


        {/* =======================================================
            FUTURE DATA PIPELINE
        ======================================================= */}

        <section className="mt-12 overflow-hidden border border-dashed border-black/20 bg-white/60 shadow-[0_4px_14px_rgba(0,0,0,0.03)]">

          <div className="flex flex-wrap items-center justify-between gap-8 px-8 py-8">

            <div>

              <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                FUTURE DATA PIPELINE
              </p>

              <h3 className="mt-3 text-lg font-bold">
                eRTMAC + Historical Well Data
              </h3>

              <p className="mt-3 max-w-3xl text-xs leading-6 text-black/45">
                The correlation engine can later consume WITSML
                trajectory data, drilling parameters, events, and ML
                model output without changing this interface.
              </p>

            </div>


            <div className="border-l border-black/10 pl-8">

              <p className="text-[9px] font-bold tracking-widest text-black/40">
                DATA SOURCE
              </p>

              <p className="mt-2 text-sm font-bold">
                WITSML / ML
              </p>

            </div>

          </div>

        </section>

      </section>

      {/* Modals */}
      {showLogIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-300">
          <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform transition-transform duration-300 scale-100">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">
              Log Incident
            </h2>
            <form onSubmit={handleLogIncident} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Well Name</label>
                <input required type="text" value={incidentData.well_name} onChange={e => setIncidentData({...incidentData, well_name: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Formation Name</label>
                  <input required type="text" value={incidentData.formation_name} onChange={e => setIncidentData({...incidentData, formation_name: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Depth (m)</label>
                  <input required type="number" step="any" value={incidentData.depth_m} onChange={e => setIncidentData({...incidentData, depth_m: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Type</label>
                  <input required type="text" value={incidentData.incident_type} onChange={e => setIncidentData({...incidentData, incident_type: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Severity</label>
                  <select value={incidentData.severity} onChange={e => setIncidentData({...incidentData, severity: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">NPT Hours</label>
                <input required type="number" step="any" value={incidentData.npt_hours} onChange={e => setIncidentData({...incidentData, npt_hours: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Mitigation SOP</label>
                <textarea required value={incidentData.mitigation_sop} onChange={e => setIncidentData({...incidentData, mitigation_sop: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20 min-h-[80px]" />
              </div>
              <div className="mt-4 flex gap-4">
                <button type="button" onClick={() => setShowLogIncidentModal(false)} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95">
                  Cancel
                </button>
                <button type="submit" disabled={isLoggingIncident} className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all hover:bg-[#FDB813] hover:text-black hover:shadow-lg active:scale-95">
                  {isLoggingIncident ? 'Logging...' : 'Log Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCorrelateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-300">
          <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-y-auto max-h-[90vh] transform transition-transform duration-300 scale-100">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">
              Formation Correlation
            </h2>
            <form onSubmit={handleCorrelate} className="flex flex-col gap-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Formation To Search</label>
                <input required type="text" placeholder="e.g. Barail" value={correlateFormation} onChange={e => setCorrelateFormation(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => { setShowCorrelateModal(false); setCorrelateResults(null); }} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95">
                  Close
                </button>
                <button type="submit" disabled={isCorrelating} className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all hover:bg-[#FDB813] hover:text-black hover:shadow-lg active:scale-95">
                  {isCorrelating ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {correlateResults && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Results for: <span className="text-[#FDB813]">{correlateFormation}</span></h3>
                {correlateResults.incidents?.length > 0 ? (
                  <ul className="space-y-4">
                    {correlateResults.incidents.map((inc: any, i: number) => (
                      <li key={i} className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-sm font-bold text-gray-900 mb-1">{inc.well_name} <span className="text-gray-400 font-normal">— {inc.depth_m}m</span></p>
                        <p className="text-xs text-red-500 font-semibold tracking-wide mb-3 uppercase">{inc.incident_type} • {inc.severity} Severity</p>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Mitigation SOP</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{inc.mitigation_sop}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-500">No incidents found for this formation.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default Investigate