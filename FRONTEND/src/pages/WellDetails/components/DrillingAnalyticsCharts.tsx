import React from 'react';
import type { DrillingAnalyticsData, FacetChartConfig } from '../../../types/wellData';

interface DrillingAnalyticsChartsProps {
  analytics: DrillingAnalyticsData;
}

export const DrillingAnalyticsCharts: React.FC<DrillingAnalyticsChartsProps> = ({
  analytics,
}) => {
  const { mdVsTvd, rateOfTurn, inclinationAzimuth, rateOfBuild } = analytics;

  // Helper component for single-panel MD vs TVD Chart
  const RenderMdVsTvdChart = () => {
    const width = 440;
    const height = 300;
    const padding = { top: 35, right: 120, bottom: 45, left: 55 };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const xMax = 3500;
    const yMax = 3000;

    const xScale = (val: number) => padding.left + (val / xMax) * plotWidth;
    const yScale = (val: number) => padding.top + plotHeight - (val / yMax) * plotHeight;

    // Series paths
    const f4Points = mdVsTvd
      .filter((p) => p['NO 15/9-F-4'] !== undefined)
      .map((p) => `${xScale(p.md)},${yScale(p['NO 15/9-F-4']!)}`)
      .join(' L ');

    const f7Points = mdVsTvd
      .filter((p) => p['NO 15/9-F-7'] !== undefined)
      .map((p) => `${xScale(p.md)},${yScale(p['NO 15/9-F-7']!)}`)
      .join(' L ');

    const f9Points = mdVsTvd
      .filter((p) => p['NO 15/9-F-9'] !== undefined)
      .map((p) => `${xScale(p.md)},${yScale(p['NO 15/9-F-9']!)}`)
      .join(' L ');

    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <h4 className="text-xs font-bold text-gray-900 mb-1 ml-2">
          MD vs TVD for three wells
        </h4>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none font-sans">
          {/* ggplot2 gray plot area background */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="#EBEBEB"
          />

          {/* White Grid Lines */}
          {[0, 1000, 2000, 3000].map((yVal) => (
            <line
              key={`y-grid-${yVal}`}
              x1={padding.left}
              y1={yScale(yVal)}
              x2={padding.left + plotWidth}
              y2={yScale(yVal)}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          ))}
          {[0, 1000, 2000, 3000].map((xVal) => (
            <line
              key={`x-grid-${xVal}`}
              x1={xScale(xVal)}
              y1={padding.top}
              x2={xScale(xVal)}
              y2={padding.top + plotHeight}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          ))}

          {/* Lines for wells */}
          <path d={`M ${f4Points}`} fill="none" stroke="#FF4D4D" strokeWidth="2.5" />
          <path d={`M ${f7Points}`} fill="none" stroke="#00C853" strokeWidth="2.5" />
          <path d={`M ${f9Points}`} fill="none" stroke="#2563EB" strokeWidth="2.5" />

          {/* Y Axis Ticks & Labels */}
          {[0, 1000, 2000, 3000].map((yVal) => (
            <g key={`y-axis-${yVal}`}>
              <line
                x1={padding.left - 4}
                y1={yScale(yVal)}
                x2={padding.left}
                y2={yScale(yVal)}
                stroke="#666666"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={yScale(yVal) + 3}
                fill="#666666"
                fontSize="9"
                textAnchor="end"
              >
                {yVal}
              </text>
            </g>
          ))}

          {/* X Axis Ticks & Labels */}
          {[0, 1000, 2000, 3000].map((xVal) => (
            <g key={`x-axis-${xVal}`}>
              <line
                x1={xScale(xVal)}
                y1={padding.top + plotHeight}
                x2={xScale(xVal)}
                y2={padding.top + plotHeight + 4}
                stroke="#666666"
                strokeWidth="1"
              />
              <text
                x={xScale(xVal)}
                y={padding.top + plotHeight + 15}
                fill="#666666"
                fontSize="9"
                textAnchor="middle"
              >
                {xVal}
              </text>
            </g>
          ))}

          {/* Axis Titles */}
          <text
            x={padding.left - 35}
            y={padding.top + plotHeight / 2}
            fill="#333333"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            transform={`rotate(-90 ${padding.left - 35} ${padding.top + plotHeight / 2})`}
          >
            tvd
          </text>
          <text
            x={padding.left + plotWidth / 2}
            y={height - 10}
            fill="#333333"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            md
          </text>

          {/* Right Legend: nameWell */}
          <g transform={`translate(${padding.left + plotWidth + 15}, ${padding.top + 20})`}>
            <text x="0" y="0" fill="#333333" fontSize="10" fontWeight="bold">
              nameWell
            </text>

            <g transform="translate(0, 15)">
              <line x1="0" y1="0" x2="15" y2="0" stroke="#FF4D4D" strokeWidth="2.5" />
              <text x="20" y="3" fill="#444444" fontSize="9">
                NO 15/9-F-4
              </text>
            </g>
            <g transform="translate(0, 30)">
              <line x1="0" y1="0" x2="15" y2="0" stroke="#00C853" strokeWidth="2.5" />
              <text x="20" y="3" fill="#444444" fontSize="9">
                NO 15/9-F-7
              </text>
            </g>
            <g transform="translate(0, 45)">
              <line x1="0" y1="0" x2="15" y2="0" stroke="#2563EB" strokeWidth="2.5" />
              <text x="20" y="3" fill="#444444" fontSize="9">
                NO 15/9-F-9
              </text>
            </g>
          </g>
        </svg>
      </div>
    );
  };

  // Helper component for 3-Panel Facet Grid Plots (Rate of Turn, Inclination vs Azimuth, Rate of Build)
  const RenderFacetChart: React.FC<{ config: FacetChartConfig }> = ({ config }) => {
    const width = 520;
    const height = 300;
    const padding = { top: 35, right: 100, bottom: 45, left: 55 };

    const availableWidth = width - padding.left - padding.right;
    const panelGap = 6;
    const panelWidth = (availableWidth - panelGap * 2) / 3;
    const panelHeight = height - padding.top - padding.bottom;
    const bannerHeight = 18;

    const { yMin, yMax, xMin, xMax, yTicks, xTicks, series } = config;

    const yScale = (yVal: number) =>
      padding.top + bannerHeight + (panelHeight - bannerHeight) * (1 - (yVal - yMin) / (yMax - yMin));

    const xScale = (panelIndex: number, xVal: number) => {
      const panelLeft = padding.left + panelIndex * (panelWidth + panelGap);
      return panelLeft + ((xVal - xMin) / (xMax - xMin)) * panelWidth;
    };

    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <h4 className="text-xs font-bold text-gray-900 mb-1 ml-2">{config.title}</h4>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none font-sans">
          {series.map((item, idx) => {
            const panelLeft = padding.left + idx * (panelWidth + panelGap);
            const pathPoints = item.points
              .map((p) => `${xScale(idx, p.x)},${yScale(p.y)}`)
              .join(' L ');

            return (
              <g key={item.wellId}>
                {/* Panel Gray Banner Header */}
                <rect
                  x={panelLeft}
                  y={padding.top}
                  width={panelWidth}
                  height={bannerHeight}
                  fill="#D1D5DB"
                />
                <text
                  x={panelLeft + panelWidth / 2}
                  y={padding.top + 12}
                  fill="#333333"
                  fontSize="8.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {item.wellId}
                </text>

                {/* ggplot2 gray plot panel area */}
                <rect
                  x={panelLeft}
                  y={padding.top + bannerHeight}
                  width={panelWidth}
                  height={panelHeight - bannerHeight}
                  fill="#EBEBEB"
                />

                {/* White Horizontal Gridlines */}
                {yTicks.map((yVal) => (
                  <line
                    key={`grid-y-${idx}-${yVal}`}
                    x1={panelLeft}
                    y1={yScale(yVal)}
                    x2={panelLeft + panelWidth}
                    y2={yScale(yVal)}
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />
                ))}

                {/* White Vertical Gridlines */}
                {xTicks.map((xVal) => (
                  <line
                    key={`grid-x-${idx}-${xVal}`}
                    x1={xScale(idx, xVal)}
                    y1={padding.top + bannerHeight}
                    x2={xScale(idx, xVal)}
                    y2={padding.top + panelHeight}
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />
                ))}

                {/* Series Line Curve */}
                <path d={`M ${pathPoints}`} fill="none" stroke={item.color} strokeWidth="2.2" />

                {/* X Axis Ticks for Panel */}
                {xTicks.map((xVal) => (
                  <g key={`x-tick-${idx}-${xVal}`}>
                    <line
                      x1={xScale(idx, xVal)}
                      y1={padding.top + panelHeight}
                      x2={xScale(idx, xVal)}
                      y2={padding.top + panelHeight + 3}
                      stroke="#666666"
                      strokeWidth="1"
                    />
                    <text
                      x={xScale(idx, xVal)}
                      y={padding.top + panelHeight + 13}
                      fill="#666666"
                      fontSize="8"
                      textAnchor="middle"
                    >
                      {xVal}
                    </text>
                  </g>
                ))}
              </g>
            );
          })}

          {/* Y Axis Ticks & Labels (Far Left Panel) */}
          {yTicks.map((yVal) => (
            <g key={`y-axis-${yVal}`}>
              <line
                x1={padding.left - 4}
                y1={yScale(yVal)}
                x2={padding.left}
                y2={yScale(yVal)}
                stroke="#666666"
                strokeWidth="1"
              />
              <text
                x={padding.left - 6}
                y={yScale(yVal) + 3}
                fill="#666666"
                fontSize="8.5"
                textAnchor="end"
              >
                {yVal}
              </text>
            </g>
          ))}

          {/* Axis Labels */}
          <text
            x={padding.left - 38}
            y={padding.top + panelHeight / 2}
            fill="#333333"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            transform={`rotate(-90 ${padding.left - 38} ${padding.top + panelHeight / 2})`}
          >
            {config.yLabel}
          </text>
          <text
            x={padding.left + availableWidth / 2}
            y={height - 10}
            fill="#333333"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {config.xLabel}
          </text>

          {/* Right Legend: nameWell */}
          <g transform={`translate(${padding.left + availableWidth + 12}, ${padding.top + 20})`}>
            <text x="0" y="0" fill="#333333" fontSize="9.5" fontWeight="bold">
              nameWell
            </text>

            {series.map((item, index) => (
              <g key={item.wellId} transform={`translate(0, ${15 + index * 15})`}>
                <line x1="0" y1="0" x2="12" y2="0" stroke={item.color} strokeWidth="2.2" />
                <text x="16" y="3" fill="#444444" fontSize="8.5">
                  {item.wellId}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xs space-y-6 font-average">
      <div className="border-b border-gray-100 pb-4">
        <h3 className="text-lg font-bold text-gray-900">Drilling Parameter Analytics</h3>
        <p className="text-xs text-gray-500 mt-1">
          Comparative multi-well parameter plots for offset wells (NO 15/9-F-4, NO 15/9-F-7, NO 15/9-F-9)
        </p>
      </div>

      {/* 2x2 Grid of ggplot2-styled Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RenderMdVsTvdChart />
        <RenderFacetChart config={rateOfTurn} />
        <RenderFacetChart config={inclinationAzimuth} />
        <RenderFacetChart config={rateOfBuild} />
      </div>
    </div>
  );
};
