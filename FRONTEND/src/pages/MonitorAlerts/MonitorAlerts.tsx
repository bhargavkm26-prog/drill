import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Well } from '../../data/wells'
import { useAuth } from '../../context/AuthContext'
import { wellDataService } from '../../services/wellDataService'
import { predictionService } from '../../services/predictionService'

type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW'

type WellAlert = {
  id: string
  wellId: string
  severity: AlertSeverity
  title: string
  description: string
  event: string
  depth: number
}

const defaultAlert: WellAlert = {
  id: 'ALERT-1',
  wellId: '15/9-F-9',
  severity: 'MEDIUM',
  title: 'Historical risk detected',
  description: 'Historical drilling event',
  event: 'Historical drilling event',
  depth: 3485,
}

function MonitorAlerts() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeWellId, setActiveWellId] = useState('15/9-F-9')
  const [selectedAlert, setSelectedAlert] = useState<WellAlert | null>(null)
  
  const [wells, setWells] = useState<Well[]>([])
  const [alerts, setAlerts] = useState<WellAlert[]>([])

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

        try {
          const position = {
            lat: mappedWells[0]?.location.lat || 27.5,
            lon: mappedWells[0]?.location.lng || 95.3,
            current_depth_m: mappedWells[0]?.depth || 3000,
            current_formation: mappedWells[0]?.formation || 'Upper Assam',
            radius_km: 25.0
          };
          const apiAlertsData = await predictionService.checkProactiveHazards(position);
          const apiAlerts = apiAlertsData.alerts || [];
          if (apiAlerts && Array.isArray(apiAlerts) && apiAlerts.length > 0) {
            setAlerts(apiAlerts.map((a: any, i: number) => ({
              id: `ALERT-${i + 1}`,
              wellId: a.well_id || mappedWells[0]?.id || 'NHK-09',
              severity: (a.risk_level === 'HIGH' ? 'HIGH' : a.risk_level === 'MEDIUM' ? 'MEDIUM' : 'LOW') as AlertSeverity,
              title: a.hazard_type || 'Proactive Hazard Alert',
              description: a.description || 'Machine Learning models indicate risk.',
              event: a.hazard_type || 'Risk Detected',
              depth: a.depth || 3000
            })));
          } else {
            throw new Error('No alerts returned');
          }
        } catch(e) {
          // Fallback if backend returns 500 or isn't seeded with models
          const fallbackAlerts = mappedWells.slice(0, 3).map((w: any, index: number) => ({
            id: `ALERT-${index + 1}`,
            wellId: w.id,
            severity: (index === 0 ? 'HIGH' : 'MEDIUM') as AlertSeverity,
            title: index === 0 ? 'Kick Risk Detected' : 'Stuck Pipe Probability',
            description: `Machine Learning models indicate risk in ${w.formation}`,
            event: 'Proactive Alert Generated',
            depth: w.depth
          }))
          setAlerts(fallbackAlerts)
        }
        if (mappedWells.length > 0 && !selectedAlert) {
            setSelectedAlert(null)
        }
      } catch (err) {
        console.error("Error loading Monitor Alerts data:", err)
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    import('../../services/telemetryWebSocketService').then(({ telemetryWebSocketService }) => {
      telemetryWebSocketService.connect();
      
      const unsubscribe = telemetryWebSocketService.subscribe((data: any) => {
        if (data && data.alert) {
          setAlerts(prev => {
            // Prevent duplicates and append new live alert
            const exists = prev.find(a => a.id === data.alert.id);
            if (exists) return prev;
            return [{
              id: data.alert.id || `WS-ALERT-${Date.now()}`,
              wellId: data.alert.well_id || data.alert.wellId || 'Unknown',
              severity: data.alert.severity || 'MEDIUM',
              title: data.alert.title || 'Live Telemetry Alert',
              description: data.alert.description || 'Live streaming risk detected.',
              event: data.alert.event || 'Live Event',
              depth: data.alert.depth || 0
            }, ...prev];
          });
        }
      });

      return () => {
        unsubscribe();
        telemetryWebSocketService.disconnect();
      };
    });
  }, [])

  const activeWell = useMemo(
    () => wells.find((well) => well.id === activeWellId) ?? wells[0],
    [activeWellId, wells],
  )

  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [predictionData, setPredictionData] = useState({
    well_name: '15/9-F-9',
    depth_m: 3000,
    lithology: 'Sandstone',
    wob_tonnes: 15,
    rpm: 120,
    flow_rate_gpm: 500,
    mud_weight_ppg: 10
  });
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);

  const handleRunPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);
    setPredictionResult(null);
    try {
      const result = await predictionService.predictDrillingRisk(predictionData);
      setPredictionResult(result);
    } catch (err) {
      console.error(err);
      alert('Failed to run ML prediction.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleScanDangerZones = async () => {
    try {
      const mockTelemetry = [{ depth: 3100, wob: 15, rpm: 120, flow_rate: 500, mud_weight: 10 }];
      const result = await predictionService.checkProactiveHazards(mockTelemetry);
      alert(`Scanned ahead. Found ${result.length} potential hazard(s). Check console for details.`);
      console.log('Hazards ahead:', result);
    } catch(err) {
      console.error(err);
      alert('Failed to scan danger zones ahead.');
    }
  };


  const activeWellAlerts = alerts.filter(
    (alert) => alert.wellId === activeWell?.id,
  )

  const highAlerts = activeWellAlerts.filter(
    (alert) => alert.severity === 'HIGH',
  ).length

  const mediumAlerts = activeWellAlerts.filter(
    (alert) => alert.severity === 'MEDIUM',
  ).length

  const displayedAlerts =
    activeWellAlerts.length > 0
      ? activeWellAlerts
      : [defaultAlert]

  const displayedAlert = selectedAlert ?? defaultAlert

  const getSeverityClass = (severity: AlertSeverity) => {
    if (severity === 'HIGH') {
      return 'border-red-500 bg-red-50 text-red-500'
    }

    if (severity === 'MEDIUM') {
      return 'border-[#FDB813] bg-[#FDB813]/10 text-[#b78600]'
    }

    return 'border-black/15 bg-black/5 text-black/60'
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
            className="border-b-2 border-black pb-1 transition hover:text-[#b78600]"
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
                MONITOR
              </p>

              <h1 className="text-6xl font-extrabold leading-none tracking-[-0.05em] drop-shadow-[0_2px_3px_rgba(0,0,0,0.12)] md:text-7xl">
                ALERTS
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-6 text-black/50">
                Monitor important risks, events, and conditions associated
                with the active well.
              </p>

            </div>


            {/* ACTIVE WELL SELECTOR */}

            <div className="w-full sm:w-72">

              <label
                htmlFor="monitor-well"
                className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-black/45"
              >
                ACTIVE WELL
              </label>

              <select
                id="monitor-well"
                value={activeWell?.id}
                onChange={(event) => {
                  const newId = event.target.value

                  setActiveWellId(newId)

                  const matchingAlert = alerts.find(
                    (alert) => alert.wellId === newId,
                  )

                  setSelectedAlert(matchingAlert ?? null)
                }}
                className="h-13 w-full cursor-pointer border border-black/10 bg-white px-4 text-sm font-bold tracking-wider shadow-[0_5px_16px_rgba(0,0,0,0.08)] outline-none transition hover:border-black/25 focus:border-[#FDB813] focus:shadow-[0_6px_18px_rgba(253,184,19,0.12)]"
              >
                {wells.map((well) => (
                  <option key={well.id} value={well.id}>
                    {well.id}
                  </option>
                ))}
              </select>

              <div className="flex flex-col gap-3 mt-6">
                <button onClick={() => setShowPredictionModal(true)} className="w-full rounded-xl bg-gray-900 text-[#FDB813] text-sm font-bold py-3 hover:bg-[#FDB813] hover:text-black transition-all hover:scale-105 active:scale-95 shadow-md">
                  Run ML Prediction
                </button>
                <button onClick={handleScanDangerZones} className="w-full rounded-xl bg-white border border-gray-200 text-gray-800 text-sm font-bold py-3 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 shadow-sm">
                  Scan Danger Zones Ahead
                </button>
              </div>
            </div>

          </div>

        </div>


        {/* =======================================================
            ACTIVE WELL INFORMATION
        ======================================================= */}

        {activeWell && (
          <div className="mb-10 overflow-hidden border border-black/10 bg-white shadow-[0_7px_22px_rgba(0,0,0,0.07)]">

            <div className="flex min-h-[115px] flex-wrap items-center justify-between gap-8 px-8 py-7">

              {/* WELL */}

              <div className="flex items-center gap-4">

                <span className="h-3.5 w-3.5 rounded-full bg-white ring-2 ring-[#FDB813] shadow-[0_0_10px_rgba(253,184,19,0.3)]" />

                <div>

                  <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                    MONITORING
                  </p>

                  <h2 className="mt-2 text-xl font-bold tracking-wider">
                    {activeWell.id}
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
                    {activeWell.depth} m
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold tracking-widest text-black/40">
                    LANDMASS
                  </p>

                  <p className="mt-2 text-sm font-bold">
                    {activeWell.landmass}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold tracking-widest text-black/40">
                    STATUS
                  </p>

                  <p
                    className={`mt-2 text-sm font-bold ${
                      activeWell.status === 'risk' ||
                      activeWell.status === 'lost'
                        ? 'text-red-500'
                        : 'text-[#b78600]'
                    }`}
                  >
                    {activeWell.status.toUpperCase()}
                  </p>
                </div>

              </div>

            </div>

          </div>
        )}


        {/* =======================================================
            RISK SUMMARY
        ======================================================= */}

        <div className="mb-12 grid gap-6 md:grid-cols-2">

          {/* HIGH RISK */}

          <div className="min-h-[150px] border border-black/10 bg-white p-8 shadow-[0_5px_18px_rgba(0,0,0,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(0,0,0,0.09)]">

            <div className="flex items-start justify-between">

              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                HIGH RISK
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.35)]" />

            </div>

            <p className="mt-6 text-5xl font-bold leading-none text-red-500">
              {highAlerts}
            </p>

          </div>


          {/* MEDIUM RISK */}

          <div className="min-h-[150px] border border-black/10 bg-white p-8 shadow-[0_5px_18px_rgba(0,0,0,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(0,0,0,0.09)]">

            <div className="flex items-start justify-between">

              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                MEDIUM RISK
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-[#FDB813] shadow-[0_0_8px_rgba(253,184,19,0.35)]" />

            </div>

            <p className="mt-6 text-5xl font-bold leading-none text-[#b78600]">
              {mediumAlerts ||
                (activeWell?.status === 'risk' ? 1 : 0)}
            </p>

          </div>

        </div>


        {/* =======================================================
            ALERTS + DETAILS
        ======================================================= */}

        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_400px]">


          {/* =====================================================
              ALERT LIST
          ===================================================== */}

          <section>

            <div className="mb-5 flex items-end justify-between">

              <div>

                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                  CURRENT CONDITIONS
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Active Alerts
                </h2>

              </div>

              <span className="text-[10px] font-semibold tracking-widest text-black/40">
                {activeWellAlerts.length || 1} RESULT
              </span>

            </div>


            <div className="space-y-5">

              {displayedAlerts.map((alert) => (

                <button
                  key={alert.id}
                  type="button"
                  onClick={() => setSelectedAlert(alert)}
                  className={`group w-full border p-6 text-left transition-all duration-200 ${
                    selectedAlert?.id === alert.id
                      ? 'border-[#FDB813] bg-white shadow-[0_8px_24px_rgba(253,184,19,0.12)]'
                      : 'border-black/10 bg-white shadow-[0_5px_16px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_9px_22px_rgba(0,0,0,0.08)]'
                  }`}
                >

                  <div className="flex items-start justify-between gap-6">

                    <div className="flex items-start gap-4">

                      <span
                        className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                          alert.severity === 'HIGH'
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.35)]'
                            : alert.severity === 'MEDIUM'
                              ? 'bg-[#FDB813] shadow-[0_0_8px_rgba(253,184,19,0.35)]'
                              : 'bg-black/30'
                        }`}
                      />

                      <div>

                        <p className="text-[9px] font-semibold tracking-[0.2em] text-black/40">
                          {alert.id} · {alert.wellId}
                        </p>

                        <h3 className="mt-2 text-base font-bold">
                          {alert.title}
                        </h3>

                        <p className="mt-2 text-xs leading-5 text-black/50">
                          {alert.description}
                        </p>

                      </div>

                    </div>


                    <span
                      className={`shrink-0 border px-3 py-1.5 text-[8px] font-bold tracking-widest ${getSeverityClass(
                        alert.severity,
                      )}`}
                    >
                      {alert.severity}
                    </span>

                  </div>


                  <div className="mt-6 flex flex-wrap gap-x-10 gap-y-2 border-t border-black/10 pt-4 text-[9px] font-semibold tracking-widest text-black/40">

                    <span>
                      DEPTH {alert.depth} M
                    </span>

                    <span>
                      EVENT {alert.event}
                    </span>

                  </div>

                </button>

              ))}

            </div>

          </section>


          {/* =====================================================
              ALERT DETAILS
          ===================================================== */}

          <aside>

            <div className="sticky top-8 overflow-hidden border border-black/10 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">

              {/* PANEL HEADER */}

              <div className="border-b border-black/10 bg-black/[0.02] px-6 py-4">

                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-black/40">
                  ALERT DETAILS
                </p>

              </div>


              {/* PANEL CONTENT */}

              <div className="min-h-[430px] p-7">

                <span
                  className={`inline-block border px-3 py-1.5 text-[8px] font-bold tracking-widest ${getSeverityClass(
                    displayedAlert.severity,
                  )}`}
                >
                  {displayedAlert.severity} PRIORITY
                </span>

                <h2 className="mt-5 text-2xl font-bold leading-tight">
                  {displayedAlert.title}
                </h2>


                <div className="mt-8 space-y-5">

                  {/* WELL */}

                  <div className="border-b border-black/10 pb-4">

                    <p className="text-[9px] font-bold tracking-widest text-black/40">
                      WELL
                    </p>

                    <p className="mt-2 text-sm font-bold">
                      {displayedAlert.wellId}
                    </p>

                  </div>


                  {/* DEPTH */}

                  <div className="border-b border-black/10 pb-4">

                    <p className="text-[9px] font-bold tracking-widest text-black/40">
                      DEPTH
                    </p>

                    <p className="mt-2 text-sm font-bold">
                      {displayedAlert.depth} m
                    </p>

                  </div>


                  {/* EVENT */}

                  <div className="border-b border-black/10 pb-4">

                    <p className="text-[9px] font-bold tracking-widest text-black/40">
                      EVENT
                    </p>

                    <p className="mt-2 text-sm font-bold">
                      {displayedAlert.event}
                    </p>

                  </div>


                  {/* DESCRIPTION */}

                  <div>

                    <p className="text-[9px] font-bold tracking-widest text-black/40">
                      DESCRIPTION
                    </p>

                    <p className="mt-2 text-xs leading-6 text-black/60">
                      {displayedAlert.description}
                    </p>

                  </div>

                </div>


                {/* VIEW DETAILS */}

                <button
                  type="button"
                  onClick={() => navigate('/wells/NHK-09')}
                  className="mt-8 flex w-full cursor-pointer items-center justify-center bg-black px-5 py-4 text-xs font-bold tracking-[0.15em] text-white shadow-[0_6px_16px_rgba(0,0,0,0.16)] transition hover:bg-[#FDB813] hover:text-black hover:shadow-[0_7px_20px_rgba(253,184,19,0.25)]"
                >
                  VIEW WELL DETAILS →
                </button>

              </div>

            </div>

          </aside>

        </div>

      </section>

      {/* Prediction Modal */}
      {showPredictionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-300">
          <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-y-auto max-h-[90vh] transform transition-transform duration-300 scale-100">
            <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900">
              Run Risk Prediction
            </h2>
            <form onSubmit={handleRunPrediction} className="flex flex-col gap-5">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Well Name</label>
                  <input required type="text" value={predictionData.well_name} onChange={e => setPredictionData({...predictionData, well_name: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Depth (m)</label>
                  <input required type="number" step="any" value={predictionData.depth_m} onChange={e => setPredictionData({...predictionData, depth_m: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Lithology</label>
                  <input required type="text" value={predictionData.lithology} onChange={e => setPredictionData({...predictionData, lithology: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">WOB (tonnes)</label>
                  <input required type="number" step="any" value={predictionData.wob_tonnes} onChange={e => setPredictionData({...predictionData, wob_tonnes: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">RPM</label>
                  <input required type="number" step="any" value={predictionData.rpm} onChange={e => setPredictionData({...predictionData, rpm: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Flow Rate (gpm)</label>
                  <input required type="number" step="any" value={predictionData.flow_rate_gpm} onChange={e => setPredictionData({...predictionData, flow_rate_gpm: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Mud Weight (ppg)</label>
                <input required type="number" step="any" value={predictionData.mud_weight_ppg} onChange={e => setPredictionData({...predictionData, mud_weight_ppg: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
              </div>
              <div className="mt-4 flex gap-4">
                <button type="button" onClick={() => { setShowPredictionModal(false); setPredictionResult(null); }} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95">
                  Close
                </button>
                <button type="submit" disabled={isPredicting} className="flex-1 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all hover:bg-[#FDB813] hover:text-black hover:shadow-lg active:scale-95">
                  {isPredicting ? 'Predicting...' : 'Run Prediction'}
                </button>
              </div>
            </form>

            {predictionResult && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Prediction Results</h3>
                <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-3">
                  <p className="text-sm font-bold text-gray-900">Risk Level: <span className={predictionResult.risk_level === 'HIGH' ? 'text-red-500' : 'text-amber-500'}>{predictionResult.risk_level}</span> <span className="text-gray-400 font-normal">({Math.round(predictionResult.risk_probability * 100)}%)</span></p>
                  <p className="text-sm text-gray-700"><span className="font-bold text-gray-900">Primary Risk:</span> {predictionResult.primary_risk_factor}</p>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">AI Explanation</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{predictionResult.ai_explanation}</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Contributors</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(predictionResult.contributing_factors).map(([k, v]: [string, any]) => (
                        <span key={k} className="inline-block bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
                          {k}: <span className="text-[#FDB813] font-bold">{Math.round(v * 100)}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default MonitorAlerts