import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { wells } from '../../data/wells'
import { useAuth } from '../../context/AuthContext'

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
  const [selectedAlert, setSelectedAlert] =
    useState<WellAlert | null>(defaultAlert)

  const activeWell = useMemo(
    () => wells.find((well) => well.id === activeWellId) ?? wells[0],
    [activeWellId],
  )

  const alerts: WellAlert[] = useMemo(() => {
    return wells
      .filter(
        (well) =>
          well.alert ||
          well.status === 'risk' ||
          well.status === 'lost',
      )
      .map((well, index) => ({
        id: `ALERT-${index + 1}`,
        wellId: well.id,
        severity: well.status === 'lost' ? 'HIGH' : 'MEDIUM',
        title: well.alert ?? 'Historical risk detected',
        description:
          well.event ?? 'Historical drilling event',
        event:
          well.event ?? 'Historical drilling event',
        depth: well.depth,
      }))
  }, [])

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
                (activeWell.status === 'risk' ? 1 : 0)}
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
                  onClick={() => navigate('/wells/OIL-159-F-7')}
                  className="mt-8 flex w-full cursor-pointer items-center justify-center bg-black px-5 py-4 text-xs font-bold tracking-[0.15em] text-white shadow-[0_6px_16px_rgba(0,0,0,0.16)] transition hover:bg-[#FDB813] hover:text-black hover:shadow-[0_7px_20px_rgba(253,184,19,0.25)]"
                >
                  VIEW WELL DETAILS →
                </button>

              </div>

            </div>

          </aside>

        </div>

      </section>

    </main>
  )
}

export default MonitorAlerts