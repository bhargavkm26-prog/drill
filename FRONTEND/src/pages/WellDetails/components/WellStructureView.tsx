import React, { useState } from 'react';
import { Layers, Maximize2, Info } from 'lucide-react';

interface WellStructureViewProps {
  imageSrc: string;
}

export const WellStructureView: React.FC<WellStructureViewProps> = ({ imageSrc }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-500" />
          <span>Well Structure</span>
        </h3>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs transition-all hover:bg-gray-50 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>{isFullscreen ? 'Exit Fullscreen' : 'View Full Diagram'}</span>
        </button>
      </div>

      <div
        className={`relative bg-white rounded-xl border border-gray-200 p-2 shadow-2xs overflow-hidden transition-all ${
          isFullscreen ? 'fixed inset-4 z-50 p-6 flex flex-col justify-center bg-white shadow-2xl' : ''
        }`}
      >
        {/* Main Diagram Render Image */}
        <div className="relative w-full rounded-lg overflow-hidden bg-gray-950 min-h-[380px] max-h-[500px] flex items-center justify-center">
          <img
            src={imageSrc}
            alt="3D Underground Well Structure Cross Section"
            className="w-full h-full object-contain object-center max-h-[500px]"
            onError={(e) => {
              // Fallback to high quality placeholder gradient if image fails to load
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1200&q=80';
            }}
          />

          {/* Interactive Floating Annotation Badges */}
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 border border-white/20">
            <Info className="w-3.5 h-3.5 text-[#FDB813]" />
            <span>3D Subsurface Cross-Section (Assam Shelf)</span>
          </div>

          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="bg-[#D92D20] text-white px-2.5 py-1 rounded shadow-sm border border-red-400">
              Oil & Gas Zone (1,082 m)
            </span>
            <span className="bg-black/80 text-white px-2.5 py-1 rounded border border-gray-600 backdrop-blur-xs">
              Casing Pipe (9 5/8")
            </span>
            <span className="bg-amber-600/90 text-white px-2.5 py-1 rounded border border-amber-500 backdrop-blur-xs">
              Cement Slurry
            </span>
            <span className="bg-emerald-600/90 text-white px-2.5 py-1 rounded border border-emerald-500 backdrop-blur-xs">
              Pay Zone (12.5m)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
