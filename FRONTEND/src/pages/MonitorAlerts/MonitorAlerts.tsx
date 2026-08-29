import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { wells, type Well } from '../../data/wells'

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

function MonitorAlerts() {
  const [activeWellId, setActiveWellId] = useState(wells[0]?.id ?? '')
  const [selectedAlert, setSelectedAlert] =
    useState<WellAlert | null>(null)

  const activeWell = useMemo(
    () => wells.find((well) => well.id === activeWellId) ?? wells[0],
    [activeWellId],
  )

  /*
   * Temporary frontend alert interpretation.
   *
   * Later this can be replaced directly with ML/backend output
   * without changing the page structure.
   */
  const alerts: WellAlert[] = useMemo(() => {
    return wells
      .filter((well) => well.alert || well.status === 'risk' || well.status === 'lost')
      .map((well, index) => ({
        id: `ALERT-${index + 1}`,
        wellId: well.id,
        severity: well.status === 'lost' ? 'HIGH' : 'MEDIUM',
        title: well.alert ?? 'Well risk detected',
        description:
          well.event ??
          'A condition requiring further investigation has been detected.',
        event: well.event ?? 'Risk condition',
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

  const getSeverityClass = (severity: AlertSeverity) => {
    if (severity === 'HIGH') {
      return 'border-red-500 bg-red-500/10 text-red-500'
    }

    if (severity === 'MEDIUM') {
      return 'border-[#FDB813] bg-[#FDB813]/10 text-[#b78600]'
    }

    return 'border-black/20 bg-black/5 text-black/60'
  }

  return (
    <main className="min-h-screen bg-white text-black">

      {/* ================= NAVBAR ================= */}

      <nav className="flex h-20 items-center justify-between border-b border-black/10 bg-[#ffdd47] px-8">

        <Link
          to="/workspace"
          className="text-xl font-bold tracking-tight"
        >
          NWIS
        </Link>

        <div className="flex items-center gap-10 text-xs font-semibold tracking-[0.15em]">

          <Link
            to="/explore"
            className="transition hover:text-[#FDB813]"
          >
            EXPLORE
          </Link>

          <Link
            to="/monitor"
            className="border-b-2 border-black pb-1 transition hover:text-[#FDB813]"
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

        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/20 text-xs font-bold">
          M
        </div>

      </nav>


      {/* ================= PAGE ================= */}

      <section className="px-8 pb-16 pt-12">

        <div className="mx-auto max-w-7xl">

          {/* ================= HEADER ================= */}

          <div className="mb-10">

            <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-black/40">
              MONITOR
            </p>

            <div className="flex flex-wrap items-end justify-between gap-6">

              <div>

                <h1 className="text-5xl font-bold tracking-[-0.04em]">
                  ALERTS
                </h1>

                <p className="mt-3 max-w-xl text-xs leading-6 text-black/45">
                  Monitor important risks, events, and conditions
                  associated with the active well.
                </p>

              </div>


              {/* WELL SELECTOR */}

              <div className="w-full sm:w-64">

                <label
                  htmlFor="monitor-well"
                  className="mb-2 block text-[9px] font-bold tracking-[0.2em] text-black/40"
                >
                  ACTIVE WELL
                </label>

                <select
                  id="monitor-well"
                  value={activeWell?.id}
                  onChange={(event) => {
                    setActiveWellId(event.target.value)
                    setSelectedAlert(null)
                  }}
                  className="h-12 w-full border border-black/20 bg-white px-4 text-xs font-bold tracking-wider outline-none focus:border-[#FDB813]"
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


          {/* ================= ACTIVE WELL ================= */}

          {activeWell && (
            <div className="mb-8 border border-black/15">

              <div className="flex flex-wrap items-center justify-between gap-6 px-6 py-5">

                <div className="flex items-center gap-4">

                  <span className="h-3 w-3 rounded-full bg-white ring-2 ring-[#FDB813]" />

                  <div>

                    <p className="text-[9px] tracking-[0.2em] text-black/40">
                      MONITORING
                    </p>

                    <h2 className="mt-1 text-lg font-bold tracking-wider">
                      {activeWell.id}
                    </h2>

                  </div>

                </div>


                <div className="flex flex-wrap gap-8">

                  <div>
                    <p className="text-[9px] tracking-widest text-black/40">
                      DEPTH
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {activeWell.depth} m
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] tracking-widest text-black/40">
                      LANDMASS
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {activeWell.landmass}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] tracking-widest text-black/40">
                      STATUS
                    </p>

                    <p
                      className={`mt-1 text-sm font-bold ${
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


          {/* ================= SUMMARY ================= */}

          <div className="mb-8 grid gap-px border border-black/15 bg-black/15 md:grid-cols-3">

            <div className="bg-white p-6">

              <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                TOTAL ALERTS
              </p>

              <p className="mt-3 text-4xl font-bold">
                {activeWellAlerts.length}
              </p>

            </div>


            <div className="bg-white p-6">

              <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                HIGH RISK
              </p>

              <p className="mt-3 text-4xl font-bold text-red-500">
                {highAlerts}
              </p>

            </div>


            <div className="bg-white p-6">

              <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                MEDIUM RISK
              </p>

              <p className="mt-3 text-4xl font-bold text-[#b78600]">
                {mediumAlerts}
              </p>

            </div>

          </div>


          {/* ================= ALERT CONTENT ================= */}

          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">


            {/* ALERT LIST */}

            <section>

              <div className="mb-4 flex items-center justify-between">

                <div>

                  <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                    CURRENT CONDITIONS
                  </p>

                  <h2 className="mt-1 text-xl font-bold">
                    Active Alerts
                  </h2>

                </div>

                <span className="text-[10px] tracking-widest text-black/40">
                  {activeWellAlerts.length} RESULT
                  {activeWellAlerts.length !== 1 ? 'S' : ''}
                </span>

              </div>


              {activeWellAlerts.length === 0 ? (

                <div className="border border-black/15 px-6 py-16 text-center">

                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-black/15">

                    <span className="h-3 w-3 rounded-full bg-[#FDB813]" />

                  </div>

                  <h3 className="text-sm font-bold tracking-wider">
                    NO ACTIVE ALERTS
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-black/40">
                    No significant risks or events are currently
                    associated with {activeWell?.id}.
                  </p>

                </div>

              ) : (

                <div className="space-y-3">

                  {activeWellAlerts.map((alert) => (

                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => setSelectedAlert(alert)}
                      className="w-full border border-black/15 bg-white p-5 text-left transition hover:border-[#FDB813]"
                    >

                      <div className="flex items-start justify-between gap-5">

                        <div className="flex items-start gap-4">

                          <span
                            className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                              alert.severity === 'HIGH'
                                ? 'bg-red-500'
                                : alert.severity === 'MEDIUM'
                                  ? 'bg-[#FDB813]'
                                  : 'bg-black/30'
                            }`}
                          />

                          <div>

                            <p className="text-[9px] tracking-[0.2em] text-black/40">
                              {alert.id} · {alert.wellId}
                            </p>

                            <h3 className="mt-1 text-sm font-bold">
                              {alert.title}
                            </h3>

                            <p className="mt-2 text-xs leading-5 text-black/50">
                              {alert.description}
                            </p>

                          </div>

                        </div>


                        <span
                          className={`shrink-0 border px-2 py-1 text-[8px] font-bold tracking-widest ${getSeverityClass(
                            alert.severity,
                          )}`}
                        >
                          {alert.severity}
                        </span>

                      </div>


                      <div className="mt-5 flex gap-8 border-t border-black/10 pt-3 text-[9px] tracking-widest text-black/40">

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

              )}

            </section>


            {/* ALERT DETAIL */}

            <aside>

              <div className="sticky top-8 border border-black/15">

                <div className="border-b border-black/10 px-5 py-4">

                  <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                    ALERT DETAILS
                  </p>

                </div>


                {selectedAlert ? (

                  <div className="p-5">

                    <div className="mb-6">

                      <span
                        className={`inline-block border px-2 py-1 text-[8px] font-bold tracking-widest ${getSeverityClass(
                          selectedAlert.severity,
                        )}`}
                      >
                        {selectedAlert.severity} PRIORITY
                      </span>

                      <h2 className="mt-4 text-xl font-bold leading-tight">
                        {selectedAlert.title}
                      </h2>

                    </div>


                    <div className="space-y-4 text-xs">

                      <div className="border-b border-black/10 pb-3">

                        <p className="text-[9px] tracking-widest text-black/40">
                          WELL
                        </p>

                        <p className="mt-1 font-bold">
                          {selectedAlert.wellId}
                        </p>

                      </div>


                      <div className="border-b border-black/10 pb-3">

                        <p className="text-[9px] tracking-widest text-black/40">
                          DEPTH
                        </p>

                        <p className="mt-1 font-bold">
                          {selectedAlert.depth} m
                        </p>

                      </div>


                      <div className="border-b border-black/10 pb-3">

                        <p className="text-[9px] tracking-widest text-black/40">
                          EVENT
                        </p>

                        <p className="mt-1 font-bold">
                          {selectedAlert.event}
                        </p>

                      </div>


                      <div>

                        <p className="text-[9px] tracking-widest text-black/40">
                          DESCRIPTION
                        </p>

                        <p className="mt-1 leading-5 text-black/60">
                          {selectedAlert.description}
                        </p>

                      </div>

                    </div>


                    <Link
                      to={`/wells/${encodeURIComponent(
                        selectedAlert.wellId,
                      )}`}
                      className="mt-6 flex w-full items-center justify-center bg-black px-4 py-3 text-xs font-bold tracking-[0.15em] text-white transition hover:bg-[#FDB813] hover:text-black"
                    >
                      VIEW WELL DETAILS →
                    </Link>

                  </div>

                ) : (

                  <div className="px-5 py-16 text-center">

                    <p className="text-xs font-bold tracking-wider">
                      SELECT AN ALERT
                    </p>

                    <p className="mt-2 text-[10px] leading-5 text-black/40">
                      Select an alert from the list to inspect
                      its details.
                    </p>

                  </div>

                )}

              </div>

            </aside>

          </div>

        </div>

      </section>

    </main>
  )
}

export default MonitorAlerts