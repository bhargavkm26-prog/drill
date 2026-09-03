import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { HeaderNav } from './components/HeaderNav';
import { WellHeaderInfo } from './components/WellHeaderInfo';
import { FormationRiskSummary } from './components/FormationRiskSummary';
import { WellStructureView } from './components/WellStructureView';
import { HistoricalOffsetEvents } from './components/HistoricalOffsetEvents';
import { DrillingAnalyticsCharts } from './components/DrillingAnalyticsCharts';
import { OtherInformationCards } from './components/OtherInformationCards';
import { getWellDetails } from '../../services/wellDataService';
import type { WellFullDetails } from '../../types/wellData';

export const WellDetails: React.FC = () => {
  const { wellId } = useParams<{ wellId: string }>();
  const navigate = useNavigate();
  const currentWellId = wellId || 'NHK-09';

  const [wellData, setWellData] = useState<WellFullDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddFormationModal, setShowAddFormationModal] = useState(false);
  const [formationData, setFormationData] = useState({ formation_name: '', top_depth_m: 0, bottom_depth_m: 0, lithology: '' });
  const [isAddingFormation, setIsAddingFormation] = useState(false);

  const handleAddFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingFormation(true);
    try {
      const { addFormation } = await import('../../services/wellDataService');
      await addFormation(currentWellId, formationData);
      alert('Formation added successfully!');
      setShowAddFormationModal(false);
      // Optimistically reload page or refetch data here if needed
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to add formation');
    } finally {
      setIsAddingFormation(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    getWellDetails(currentWellId)
      .then((data) => {
        if (isMounted) {
          setWellData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load well data');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentWellId]);

  if (loading) {
    return (
      <div className="flex h-screen w-full bg-[#f5f5f2] font-average">
        <Sidebar activeTab="Wells" />
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="w-12 h-12 border-4 border-[#FDB813] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm font-bold text-gray-800">Loading Well Overview ({currentWellId})...</p>
        </div>
      </div>
    );
  }

  if (error || !wellData) {
    return (
      <div className="flex h-screen w-full bg-[#f5f5f2] font-average">
        <Sidebar activeTab="Wells" />
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <div className="bg-amber-50 text-amber-900 p-6 rounded-xl border border-amber-200 max-w-md shadow-xs">
            <h3 className="font-bold text-lg">Error Loading Data</h3>
            <p className="text-sm mt-1 text-gray-600">{error || 'Well details not found.'}</p>
            <button
              onClick={() => navigate('/workspace')}
              className="mt-5 px-4 py-2.5 bg-black text-[#FDB813] font-bold rounded-lg text-xs tracking-wider uppercase hover:bg-gray-900 transition-colors"
            >
              Return to Map Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f5f5f2] text-black font-average">
      {/* Left Navigation Sidebar (Analytics, Reports & Documents, Offset Wells, Settings) */}
      <Sidebar activeTab="Wells" />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Warm Yellow Top Navigation Header */}
        <HeaderNav wellId={wellData.header.wellId} />

        {/* Page Body Content - Spacious Container */}
        <main className="p-8 md:p-12 space-y-12 max-w-[1500px] w-full mx-auto">
          {/* Header Title Section */}
          <div className="border-b border-black/10 pb-6">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] text-black/40 uppercase mb-2">
              <span>WELL OVERVIEW</span>
              <span>•</span>
              <span className="text-[#b78600]">DRILLING INTELLIGENCE</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-6xl md:text-7xl font-extrabold tracking-[-0.04em] text-black">
                  WELL {wellData.header.wellId}
                </h1>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-[#b78600] tracking-wider uppercase">
                  <span>LOCATION:</span>
                  <span className="text-black font-semibold">{wellData.header.location}</span>
                </div>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-black/50 font-medium">
                  Comprehensive drilling telemetry, formation risk evaluation, 3D subsurface structure, offset event logs, and technical PDF reports.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="text-[10px] font-extrabold px-3 py-1.5 rounded bg-black text-[#FDB813] uppercase tracking-wider">
                  {wellData.header.status}
                </span>
                <span className="text-[10px] font-bold px-3 py-1.5 rounded bg-white text-black border border-black/20 font-mono">
                  MD: {wellData.header.measuredDepth}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Well Summary Header Card */}
          <WellHeaderInfo header={wellData.header} />

          {/* Section 2: Formation & Risk Summary */}
          <FormationRiskSummary data={wellData.formationRisk} />

          {/* Section 3: Well Structure 3D Diagram */}
          <WellStructureView imageSrc={wellData.wellStructureImage} />

          {/* Section 4: Historical Drilling Experiences & Offset Events */}
          <div id="offset-events-section">
            <HistoricalOffsetEvents
              events={wellData.offsetEvents}
              onViewAll={() => navigate('/workspace')}
            />
          </div>

          {/* Section 5: Drilling Parameter Analytics (Charts) */}
          <div id="analytics-section">
            <DrillingAnalyticsCharts analytics={wellData.analytics} />
          </div>

          {/* Section 6: Other Information (Mud, Casing, Cementing, Formation Tops & Reports) */}
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-base font-bold text-gray-900 invisible">Other</h3>
            <button onClick={() => setShowAddFormationModal(true)} className="px-4 py-2 rounded-full bg-black text-[#FDB813] text-xs font-bold tracking-widest hover:bg-[#FDB813] hover:text-black transition-all hover:scale-105 active:scale-95 shadow-md">
              + ADD FORMATION
            </button>
          </div>
          <OtherInformationCards data={wellData.otherInformation} />
        </main>

        {/* Add Formation Modal */}
        {showAddFormationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-opacity duration-300">
            <div className="w-full max-w-sm bg-white p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform transition-transform duration-300 scale-100">
              <h2 className="mb-5 text-xl font-bold tracking-tight text-gray-900">
                Add Formation
              </h2>
              <form onSubmit={handleAddFormation} className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Formation Name</label>
                  <input required type="text" value={formationData.formation_name} onChange={e => setFormationData({...formationData, formation_name: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Top Depth (m)</label>
                    <input required type="number" step="any" value={formationData.top_depth_m} onChange={e => setFormationData({...formationData, top_depth_m: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Bottom (m)</label>
                    <input type="number" step="any" value={formationData.bottom_depth_m} onChange={e => setFormationData({...formationData, bottom_depth_m: parseFloat(e.target.value)})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold tracking-wide text-gray-500 uppercase">Lithology</label>
                  <input required type="text" value={formationData.lithology} onChange={e => setFormationData({...formationData, lithology: e.target.value})} className="w-full rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-900 outline-none transition-all focus:border-[#FDB813] focus:bg-white focus:ring-2 focus:ring-[#FDB813]/20" />
                </div>
                <div className="mt-4 flex gap-3">
                  <button type="button" onClick={() => setShowAddFormationModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95">
                    Cancel
                  </button>
                  <button type="submit" disabled={isAddingFormation} className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#FDB813] hover:text-black hover:shadow-lg active:scale-95">
                    {isAddingFormation ? 'Adding...' : 'Add Formation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-black/10 bg-white py-6 px-8 text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2025 NWIS. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px] font-medium">
            <span>Well Overview Dashboard</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Assam Basin Block 15/9</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Security Protocol</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default WellDetails;