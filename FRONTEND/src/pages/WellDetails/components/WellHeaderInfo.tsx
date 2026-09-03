import React, { useState } from 'react';
import { Star, MapPin } from 'lucide-react';
import type { WellHeaderData } from '../../../types/wellData';

interface WellHeaderInfoProps {
  header: WellHeaderData;
}

export const WellHeaderInfo: React.FC<WellHeaderInfoProps> = ({ header }) => {
  const [isFav, setIsFav] = useState(header.isFavorite ?? true);

  return (
    <div className="bg-white rounded-xl border border-black/15 p-6 shadow-2xs space-y-6 font-average">
      {/* Top Main Details Row */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-black/10 pb-5">
        {/* Well ID & Aligned Location Below It */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider">Well ID</span>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold text-black tracking-tight">
              {header.wellId}
            </h2>
            <button
              onClick={() => setIsFav(!isFav)}
              className="text-gray-400 hover:text-amber-500 transition-colors p-1"
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star
                className={`w-4 h-4 ${
                  isFav ? 'fill-[#FDB813] text-[#FDB813]' : 'text-gray-300'
                }`}
              />
            </button>
          </div>

          {/* Aligned Location Directly Below Well ID */}
          <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-black/70">
            <MapPin className="w-3.5 h-3.5 text-[#b78600] shrink-0" />
            <span>{header.location}</span>
          </div>
        </div>

        {/* Status */}
        <div>
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider block">Status</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-bold text-black uppercase">{header.status}</span>
          </div>
        </div>

        {/* MD */}
        <div>
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider block">MD</span>
          <p className="text-lg font-bold text-black mt-1">{header.measuredDepth}</p>
        </div>

        {/* TVD */}
        <div>
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider block">TVD</span>
          <p className="text-lg font-bold text-black mt-1">{header.trueVerticalDepth}</p>
        </div>

        {/* Last Updated */}
        <div>
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider block">Last Updated</span>
          <p className="text-sm font-semibold text-black/80 mt-1.5">{header.lastUpdated}</p>
        </div>
      </div>

      {/* Secondary Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
        <div>
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider block">Rig</span>
          <p className="text-sm font-bold text-black mt-0.5">{header.rig}</p>
        </div>
        <div>
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider block">Operator</span>
          <p className="text-sm font-bold text-black mt-0.5">{header.operator}</p>
        </div>
        <div>
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider block">Spud Date</span>
          <p className="text-sm font-bold text-black mt-0.5">{header.spudDate}</p>
        </div>
        <div>
          <span className="text-[10px] text-black/40 font-bold uppercase tracking-wider block">Objective</span>
          <p className="text-sm font-bold text-black mt-0.5">{header.objective}</p>
        </div>
      </div>
    </div>
  );
};
