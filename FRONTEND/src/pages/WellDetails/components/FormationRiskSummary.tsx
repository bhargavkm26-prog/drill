import React from 'react';
import { Droplet } from 'lucide-react';
import type { FormationRiskSummary as FormationRiskSummaryType } from '../../../types/wellData';

interface FormationRiskSummaryProps {
  data: FormationRiskSummaryType;
}

export const FormationRiskSummary: React.FC<FormationRiskSummaryProps> = ({ data }) => {
  const { hydrocarbon, formation, riskAssessment } = data;

  // Donut chart calculation for similarity gauge
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskAssessment.similarityScorePercentage / 100) * circumference;

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-gray-900">Formation & Risk Summary</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Depth & Hydrocarbon Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium block">
              Oil / Gas Found At Depth
            </span>
            <div className="text-3xl font-extrabold text-[#FDB813] tracking-tight mt-2">
              {hydrocarbon.depthFound}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-gray-100">
            <div>
              <span className="text-xs text-gray-400 font-medium block">
                Hydrocarbon Type
              </span>
              <div className="flex items-center gap-1.5 mt-1 font-semibold text-sm text-gray-900">
                <Droplet className="w-4 h-4 text-gray-700 fill-gray-700" />
                <span>{hydrocarbon.hydrocarbonType}</span>
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">
                Pay Zone Thickness
              </span>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {hydrocarbon.payZoneThickness}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Formation & Geology Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs text-gray-500 font-medium block">Formation</span>
            <h4 className="text-xl font-extrabold text-gray-900 mt-1">
              {formation.name}
            </h4>
          </div>

          <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <span className="text-xs text-gray-400 font-medium block">Lithology</span>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {formation.lithology}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">Age</span>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {formation.age}
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Similarity / Risk Assessment */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-gray-500 font-medium block">
            Similarity / Risk Assessment
          </span>

          <div className="flex items-center gap-4 mt-2">
            {/* SVG Donut Gauge Chart */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="text-gray-100"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="text-[#FDB813] transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-base font-extrabold text-gray-900">
                  {riskAssessment.similarityScorePercentage}%
                </span>
              </div>
            </div>

            <div>
              <span className="text-sm font-bold text-gray-900 block">
                {riskAssessment.chanceCategory}
              </span>
            </div>
          </div>

          <ul className="mt-3 text-xs text-gray-600 space-y-1 list-disc pl-4 border-t border-gray-100 pt-3">
            {riskAssessment.riskPoints.map((point, index) => (
              <li key={index} className="leading-snug">
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
