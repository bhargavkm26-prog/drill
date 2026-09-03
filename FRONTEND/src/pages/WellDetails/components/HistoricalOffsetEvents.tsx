import React, { useState } from 'react';
import { ArrowRight, Filter } from 'lucide-react';
import type { OffsetEvent } from '../../../types/wellData';

interface HistoricalOffsetEventsProps {
  events: OffsetEvent[];
  onViewAll?: () => void;
}

export const HistoricalOffsetEvents: React.FC<HistoricalOffsetEventsProps> = ({
  events,
  onViewAll,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All Events');

  const filterTabs = [
    'All Events',
    'Mud Losses',
    'Kicks',
    'Stuck Pipe',
    'Casing Programs',
    'Cementing',
    'Formation Risks',
  ];

  const filteredEvents = events.filter((evt) => {
    if (selectedFilter === 'All Events') return true;
    if (selectedFilter === 'Mud Losses') return evt.eventType === 'Mud Loss';
    if (selectedFilter === 'Kicks') return evt.eventType === 'Kick';
    if (selectedFilter === 'Stuck Pipe') return evt.eventType === 'Stuck Pipe';
    if (selectedFilter === 'Casing Programs') return evt.eventType === 'Casing Programs';
    if (selectedFilter === 'Cementing') return evt.eventType === 'Cementing';
    if (selectedFilter === 'Formation Risks') return evt.eventType === 'Formation Risks';
    return true;
  });

  const getSeverityBadge = (severity: 'Low' | 'Moderate' | 'High') => {
    switch (severity) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            High
          </span>
        );
      case 'Moderate':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Moderate
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            Low
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs space-y-6 font-average">
      {/* Header & Subtitle */}
      <div>
        <h3 className="text-lg font-bold text-gray-900">
          Historical Drilling Experiences & Operational Events (Offset Wells)
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-4xl leading-relaxed">
          Provide instant access to historical drilling experiences and operational events from offset wells. Correlate drilling parameters, reservoir characteristics, mud losses, kicks, stuck pipe incidents, casing programs, cementing practices, and formation-specific risks across wells.
        </p>
      </div>

      {/* Filter Tabs matching screenshot */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
        <Filter className="w-4 h-4 text-gray-400 mr-1" />
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setSelectedFilter(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#FDB813] text-gray-950 shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Offset Events Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-600 font-bold">
              <th className="py-4 px-5 rounded-tl-xl">Well ID</th>
              <th className="py-4 px-5">Distance (km)</th>
              <th className="py-4 px-5">Events</th>
              <th className="py-4 px-5">Formation</th>
              <th className="py-4 px-5">MD (m)</th>
              <th className="py-4 px-5">TVD (m)</th>
              <th className="py-4 px-5">Event Type</th>
              <th className="py-4 px-5">Severity</th>
              <th className="py-4 px-5 rounded-tr-xl">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800 font-medium">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-4.5 px-5 font-bold text-gray-900">{evt.wellId}</td>
                  <td className="py-4.5 px-5">{evt.distanceKm}</td>
                  <td className="py-4.5 px-5">{evt.events}</td>
                  <td className="py-4.5 px-5 text-gray-700">{evt.formation}</td>
                  <td className="py-4.5 px-5">{evt.measuredDepth.toLocaleString()}</td>
                  <td className="py-4.5 px-5">{evt.trueVerticalDepth.toLocaleString()}</td>
                  <td className="py-4.5 px-5 font-semibold">{evt.eventType}</td>
                  <td className="py-4.5 px-5">{getSeverityBadge(evt.severity)}</td>
                  <td className="py-4.5 px-5 text-gray-500">{evt.date}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-400 italic">
                  No operational events matching the filter "{selectedFilter}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Center Pill Button matching screenshot */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onViewAll}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-full text-xs font-bold text-gray-800 bg-white hover:bg-gray-50 transition-all shadow-xs cursor-pointer"
        >
          <span>View All Offset Wells</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
