import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { wells, type Well } from '../../data/wells'

type Comparison = {
  well: Well
  depthDifference: number
  distance: number
  statusMatch: boolean
  eventPresent: boolean
}

function Investigate() {
  const [selectedWellId, setSelectedWellId] = useState(
    wells[0]?.id ?? '',
  )

  const selectedWell = useMemo(
    () =>
      wells.find((well) => well.id === selectedWellId) ??
      wells[0],
    [selectedWellId],
  )

  /*
   * Cross-well comparison.
   *
   * IMPORTANT:
   * This is intentionally kept separate from the UI.
   *
   * At present it uses the data available in wells.ts.
   * Later the backend / ML model can replace this section
   * with actual correlation results from eRTMAC + historical
   * well data without changing the page structure.
   */
  const comparisons: Comparison[] = useMemo(() => {
    if (!selectedWell) return []

    return wells
      .filter((well) => well.id !== selectedWell.id)
      .map((well) => ({
        well,
        depthDifference: Math.abs(
          Number(well.depth) - Number(selectedWell.depth),
        ),
        distance: Number(well.distance ?? 0),
        statusMatch: well.status === selectedWell.status,
        eventPresent: Boolean(well.alert || well.event),
      }))
  }, [selectedWell])

  if (!selectedWell) {
    return null
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
            className="transition hover:text-[#FDB813]"
          >
            MONITOR / ALERTS
          </Link>

          <Link
            to="/investigate"
            className="border-b-2 border-black pb-1 transition hover:text-[#FDB813]"
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

          <div className="mb-10 flex flex-wrap items-end justify-between gap-8">

            <div>

              <p className="mb-2 text-[10px] font-bold tracking-[0.25em] text-black/40">
                INVESTIGATION
              </p>

              <h1 className="text-5xl font-bold tracking-[-0.04em]">
                CORRELATION
              </h1>

              <p className="mt-3 max-w-2xl text-xs leading-6 text-black/45">
                Compare the selected well against nearby wells to
                identify related drilling conditions, events, and
                trajectory characteristics.
              </p>

            </div>


            {/* ================= WELL SELECTOR ================= */}

            <div className="w-full sm:w-72">

              <label
                htmlFor="investigate-well"
                className="mb-2 block text-[9px] font-bold tracking-[0.2em] text-black/40"
              >
                SELECT WELL
              </label>

              <select
                id="investigate-well"
                value={selectedWell.id}
                onChange={(event) =>
                  setSelectedWellId(event.target.value)
                }
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


          {/* ================= SELECTED WELL ================= */}

          <section className="mb-8 border border-black/15">

            <div className="flex flex-wrap items-center justify-between gap-8 px-6 py-6">

              <div>

                <p className="text-[9px] tracking-[0.2em] text-black/40">
                  REFERENCE WELL
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-wider">
                  {selectedWell.id}
                </h2>

              </div>


              <div className="flex flex-wrap gap-10">

                <div>
                  <p className="text-[9px] tracking-widest text-black/40">
                    DEPTH
                  </p>

                  <p className="mt-1 text-sm font-bold">
                    {selectedWell.depth} m
                  </p>
                </div>


                <div>
                  <p className="text-[9px] tracking-widest text-black/40">
                    LANDMASS
                  </p>

                  <p className="mt-1 text-sm font-bold uppercase">
                    {selectedWell.landmass}
                  </p>
                </div>


                <div>
                  <p className="text-[9px] tracking-widest text-black/40">
                    STATUS
                  </p>

                  <p
                    className={`mt-1 text-sm font-bold uppercase ${
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


          {/* ================= COMPARISON ================= */}

          <section>

            <div className="mb-5">

              <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                CROSS-WELL ANALYSIS
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Related Wells
              </h2>

            </div>


            <div className="space-y-4">

              {comparisons.map((comparison) => {

                const { well } = comparison

                return (
                  <div
                    key={well.id}
                    className="border border-black/15 bg-white"
                  >

                    {/* ================= WELL HEADER ================= */}

                    <div className="flex flex-wrap items-center justify-between gap-5 border-b border-black/10 px-6 py-5">

                      <div className="flex items-center gap-4">

                        <span
                          className={`h-3 w-3 rounded-full ${
                            well.status === 'risk' ||
                            well.status === 'lost'
                              ? 'bg-red-500'
                              : 'bg-[#FDB813]'
                          }`}
                        />

                        <div>

                          <p className="text-[9px] tracking-[0.2em] text-black/40">
                            COMPARISON WELL
                          </p>

                          <h3 className="mt-1 text-base font-bold tracking-wider">
                            {well.id}
                          </h3>

                        </div>

                      </div>


                      <Link
                        to={`/wells/${encodeURIComponent(well.id)}`}
                        className="text-[9px] font-bold tracking-[0.15em] text-black transition hover:text-[#FDB813]"
                      >
                        VIEW WELL →
                      </Link>

                    </div>


                    {/* ================= METRICS ================= */}

                    <div className="grid gap-px bg-black/10 sm:grid-cols-4">

                      <div className="bg-white px-5 py-5">

                        <p className="text-[9px] tracking-widest text-black/40">
                          DISTANCE
                        </p>

                        <p className="mt-2 text-lg font-bold">
                          {comparison.distance} km
                        </p>

                      </div>


                      <div className="bg-white px-5 py-5">

                        <p className="text-[9px] tracking-widest text-black/40">
                          DEPTH DIFFERENCE
                        </p>

                        <p className="mt-2 text-lg font-bold">
                          {comparison.depthDifference} m
                        </p>

                      </div>


                      <div className="bg-white px-5 py-5">

                        <p className="text-[9px] tracking-widest text-black/40">
                          STATUS RELATION
                        </p>

                        <p className="mt-2 text-sm font-bold uppercase">
                          {comparison.statusMatch
                            ? 'MATCH'
                            : 'DIFFERENT'}
                        </p>

                      </div>


                      <div className="bg-white px-5 py-5">

                        <p className="text-[9px] tracking-widest text-black/40">
                          EVENT DATA
                        </p>

                        <p
                          className={`mt-2 text-sm font-bold uppercase ${
                            comparison.eventPresent
                              ? 'text-red-500'
                              : 'text-black/50'
                          }`}
                        >
                          {comparison.eventPresent
                            ? 'PRESENT'
                            : 'NONE'}
                        </p>

                      </div>

                    </div>


                    {/* ================= CORRELATION AREA ================= */}

                    <div className="border-t border-black/10 px-6 py-6">

                      <div className="flex flex-wrap items-start justify-between gap-6">

                        <div className="max-w-2xl">

                          <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                            CORRELATION DATA
                          </p>

                          <p className="mt-2 text-xs leading-6 text-black/55">
                            This well is being evaluated against{' '}
                            <span className="font-bold text-black">
                              {selectedWell.id}
                            </span>{' '}
                            using the currently available well
                            metadata. Deeper trajectory and
                            time-series correlation will be supplied
                            by the drilling-data / ML pipeline.
                          </p>

                        </div>


                        <div className="border border-[#FDB813] bg-[#FDB813]/10 px-4 py-3">

                          <p className="text-[8px] font-bold tracking-[0.18em] text-black/50">
                            ANALYSIS STATE
                          </p>

                          <p className="mt-1 text-xs font-bold">
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


          {/* ================= FUTURE DATA ================= */}

          <section className="mt-10 border border-dashed border-black/20 px-6 py-6">

            <div className="flex flex-wrap items-center justify-between gap-6">

              <div>

                <p className="text-[9px] font-bold tracking-[0.2em] text-black/40">
                  FUTURE DATA PIPELINE
                </p>

                <h3 className="mt-2 text-sm font-bold">
                  eRTMAC + Historical Well Data
                </h3>

                <p className="mt-2 max-w-2xl text-xs leading-5 text-black/40">
                  The correlation engine can later consume WITSML
                  trajectory data, drilling parameters, events, and
                  the ML model output without changing this interface.
                </p>

              </div>

              <div className="text-right">

                <p className="text-[9px] tracking-widest text-black/40">
                  DATA SOURCE
                </p>

                <p className="mt-1 text-xs font-bold">
                  WITSML / ML
                </p>

              </div>

            </div>

          </section>

        </div>

      </section>

    </main>
  )
}

export default Investigate