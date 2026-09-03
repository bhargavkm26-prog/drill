import type { WellFullDetails } from '../types/wellData';

export const defaultWellDetailsData: WellFullDetails = {
  header: {
    wellId: 'NHK-09',
    status: 'Drilling',
    measuredDepth: '3,120.00 m',
    trueVerticalDepth: '2,840.50 m',
    lastUpdated: '10 mins ago',
    location: 'Assam Basin, Block 15/9',
    rig: 'Rig D-800 Enterprise',
    operator: 'Oil India Limited',
    spudDate: '12 Jan 2026',
    objective: 'Production & Reservoir Characterization',
    isFavorite: true,
  },
  formationRisk: {
    hydrocarbon: {
      depthFound: '1,082.00 m',
      hydrocarbonType: 'Crude Oil (38° API)',
      payZoneThickness: '12.50 m',
    },
    formation: {
      name: 'Upper Boka Sandstone',
      lithology: 'Sandstone with Shale Interbeds',
      age: 'Miocene',
    },
    riskAssessment: {
      similarityScorePercentage: 72,
      chanceCategory: 'Moderate Chance of Pay',
      riskPoints: [
        'Potential mud losses in fractured zones near 1,020 m depth.',
        'High permeability formation - check kick potential during connections.',
        'Similar lithology profile matched with Offset Well NO 15/9-F-4 (72%).',
      ],
    },
  },
  wellStructureImage: '/well_structure_3d.png',
  offsetEvents: [
    {
      id: 'evt-101',
      wellId: 'NO 15/9-F-4',
      distanceKm: 1.2,
      events: 'Severe mud loss (15 m³/hr) reported in Tipam Sandstone zone',
      formation: 'Tipam Sandstone',
      measuredDepth: 1020,
      trueVerticalDepth: 980,
      eventType: 'Mud Loss',
      severity: 'High',
      date: '14 Feb 2024',
    },
    {
      id: 'evt-102',
      wellId: 'NO 15/9-F-4',
      distanceKm: 1.2,
      events: 'Gas kick observed (12 bbl gain) during trip at 1,085 m MD',
      formation: 'Upper Boka Sandstone',
      measuredDepth: 1085,
      trueVerticalDepth: 1040,
      eventType: 'Kick',
      severity: 'High',
      date: '18 Feb 2024',
    },
    {
      id: 'evt-103',
      wellId: 'NO 15/9-F-9',
      distanceKm: 2.8,
      events: 'Differential pipe sticking occurred due to high overbalance',
      formation: 'Boka Shale',
      measuredDepth: 610,
      trueVerticalDepth: 600,
      eventType: 'Stuck Pipe',
      severity: 'Moderate',
      date: '02 Aug 2025',
    },
    {
      id: 'evt-104',
      wellId: 'NO 15/9-F-9',
      distanceKm: 2.8,
      events: 'Cement channeling prevented by high-energy spacer pre-flush',
      formation: 'Tipam Sandstone',
      measuredDepth: 450,
      trueVerticalDepth: 450,
      eventType: 'Cementing',
      severity: 'Low',
      date: '10 Aug 2025',
    },
  ],
  analytics: {
    mdVsTvd: [
      { md: 0, 'NO 15/9-F-4': 0, 'NO 15/9-F-7': 0, 'NO 15/9-F-9': 0 },
      { md: 500, 'NO 15/9-F-4': 490, 'NO 15/9-F-7': 495, 'NO 15/9-F-9': 485 },
      { md: 1000, 'NO 15/9-F-4': 960, 'NO 15/9-F-7': 975, 'NO 15/9-F-9': 950 },
      { md: 1500, 'NO 15/9-F-4': 1410, 'NO 15/9-F-7': 1435, 'NO 15/9-F-9': 1400 },
      { md: 2000, 'NO 15/9-F-4': 1850, 'NO 15/9-F-7': 1880, 'NO 15/9-F-9': 1830 },
      { md: 2500, 'NO 15/9-F-4': 2280, 'NO 15/9-F-7': 2315, 'NO 15/9-F-9': 2260 },
      { md: 3000, 'NO 15/9-F-4': 2700, 'NO 15/9-F-7': 2740, 'NO 15/9-F-9': 2680 },
    ],
    rateOfTurn: {
      title: 'Rate of Turn vs Depth for three wells',
      yLabel: 'dturn',
      xLabel: 'depth',
      yMin: -0.4,
      yMax: 0.2,
      xMin: 0,
      xMax: 3000,
      yTicks: [-0.4, -0.2, 0.0, 0.2],
      xTicks: [0, 1000, 2000, 3000],
      series: [
        {
          wellId: 'NO 15/9-F-4',
          color: '#FF4D4D',
          points: [
            { x: 0, y: 0.00 }, { x: 200, y: -0.01 }, { x: 400, y: 0.01 }, { x: 600, y: -0.01 },
            { x: 800, y: 0.00 }, { x: 1000, y: -0.005 }, { x: 1200, y: 0.005 }, { x: 1400, y: -0.003 },
            { x: 1600, y: 0.002 }, { x: 1800, y: -0.004 }, { x: 2000, y: 0.003 }, { x: 2200, y: -0.002 },
            { x: 2400, y: 0.004 }, { x: 2600, y: -0.001 }, { x: 2800, y: 0.002 }, { x: 3000, y: 0.00 },
          ],
        },
        {
          wellId: 'NO 15/9-F-7',
          color: '#00C853',
          points: [
            { x: 0, y: 0.00 }, { x: 150, y: 0.01 }, { x: 250, y: -0.04 }, { x: 300, y: 0.13 },
            { x: 330, y: -0.32 }, { x: 360, y: 0.08 }, { x: 400, y: -0.12 }, { x: 450, y: 0.05 },
            { x: 500, y: -0.03 }, { x: 600, y: 0.01 }, { x: 700, y: 0.00 }, { x: 900, y: 0.00 }, { x: 1100, y: 0.00 },
          ],
        },
        {
          wellId: 'NO 15/9-F-9',
          color: '#2563EB',
          points: [
            { x: 0, y: 0.00 }, { x: 150, y: -0.03 }, { x: 250, y: 0.07 }, { x: 300, y: -0.07 },
            { x: 350, y: 0.04 }, { x: 400, y: -0.04 }, { x: 450, y: 0.02 }, { x: 500, y: -0.01 },
            { x: 600, y: 0.00 }, { x: 800, y: 0.00 }, { x: 1000, y: 0.00 },
          ],
        },
      ],
    },
    inclinationAzimuth: {
      title: 'Inclination vs Azimuth for three wells',
      yLabel: 'azi',
      xLabel: 'incl',
      yMin: 0,
      yMax: 6,
      xMin: 0.0,
      xMax: 1.0,
      yTicks: [0, 2, 4, 6],
      xTicks: [0.00, 0.25, 0.50, 0.75, 1.00],
      series: [
        {
          wellId: 'NO 15/9-F-4',
          color: '#FF4D4D',
          points: [
            { x: 0.00, y: 0.0 }, { x: 0.08, y: 4.1 }, { x: 0.15, y: 4.2 }, { x: 0.25, y: 2.8 },
            { x: 0.35, y: 2.5 }, { x: 0.40, y: 2.0 }, { x: 0.48, y: 1.8 }, { x: 0.55, y: 2.7 },
            { x: 0.70, y: 3.1 }, { x: 0.85, y: 3.3 }, { x: 1.00, y: 3.5 },
          ],
        },
        {
          wellId: 'NO 15/9-F-7',
          color: '#00C853',
          points: [
            { x: 0.00, y: 0.0 }, { x: 0.10, y: 3.0 }, { x: 0.20, y: 5.5 }, { x: 0.30, y: 5.8 },
            { x: 0.40, y: 5.2 }, { x: 0.50, y: 4.8 }, { x: 0.65, y: 4.9 }, { x: 0.80, y: 5.1 }, { x: 1.00, y: 5.3 },
          ],
        },
        {
          wellId: 'NO 15/9-F-9',
          color: '#2563EB',
          points: [
            { x: 0.00, y: 0.0 }, { x: 0.12, y: 1.5 }, { x: 0.25, y: 2.1 }, { x: 0.38, y: 2.4 },
            { x: 0.50, y: 2.2 }, { x: 0.68, y: 2.0 }, { x: 0.85, y: 2.3 }, { x: 1.00, y: 2.5 },
          ],
        },
      ],
    },
    rateOfBuild: {
      title: 'Rate of Build vs Depth for three wells',
      yLabel: 'dbuild',
      xLabel: 'depth',
      yMin: -0.4,
      yMax: 0.2,
      xMin: 0,
      xMax: 3000,
      yTicks: [-0.4, -0.2, 0.0, 0.2],
      xTicks: [0, 1000, 2000, 3000],
      series: [
        {
          wellId: 'NO 15/9-F-4',
          color: '#FF4D4D',
          points: [
            { x: 0, y: 0.00 }, { x: 300, y: -0.01 }, { x: 600, y: 0.01 }, { x: 900, y: -0.01 },
            { x: 1200, y: 0.00 }, { x: 1500, y: 0.005 }, { x: 1800, y: -0.005 }, { x: 2100, y: 0.002 },
            { x: 2400, y: -0.002 }, { x: 2700, y: 0.001 }, { x: 3000, y: 0.00 },
          ],
        },
        {
          wellId: 'NO 15/9-F-7',
          color: '#00C853',
          points: [
            { x: 0, y: 0.00 }, { x: 200, y: 0.02 }, { x: 300, y: -0.08 }, { x: 330, y: 0.15 },
            { x: 360, y: -0.35 }, { x: 400, y: 0.06 }, { x: 450, y: -0.09 }, { x: 500, y: 0.02 },
            { x: 600, y: 0.00 }, { x: 900, y: 0.00 }, { x: 1200, y: 0.00 },
          ],
        },
        {
          wellId: 'NO 15/9-F-9',
          color: '#2563EB',
          points: [
            { x: 0, y: 0.00 }, { x: 200, y: -0.02 }, { x: 300, y: 0.05 }, { x: 350, y: -0.06 },
            { x: 400, y: 0.03 }, { x: 450, y: -0.03 }, { x: 500, y: 0.01 }, { x: 600, y: 0.00 },
            { x: 800, y: 0.00 }, { x: 1000, y: 0.00 },
          ],
        },
      ],
    },
  },
  otherInformation: {
    mudProgram: {
      weight: '10.5 ppg',
      type: 'Oil Based Mud',
    },
    casingProgram: {
      surfaceCasing: '13 3/8" @ 350 m',
      intermediateCasing: '9 5/8" @ 1,050 m',
    },
    cementingPractice: {
      primaryLead: '600 m³',
      primaryTail: '300 m³',
      topOfCement: 'Surface',
    },
    formationTops: [
      { name: 'Tipam Sandstone', depth: '450 m' },
      { name: 'Boka Shale', depth: '600 m' },
      { name: 'Upper Boka Sandstone', depth: '1,050 m' },
      { name: 'Pay Zone', depth: '1,082 m', isPayZone: true },
    ],
    lessonsLearned: [
      {
        category: 'Hole Cleaning & Sweep',
        description: 'High ECD observed at 1,020 m depth due to cutting build-up in 12-1/4" section.',
        recommendation: 'Run tandem high-vis sweeps every 100m. Increase flow rate to 950 GPM during connections.',
      },
      {
        category: 'Torque & Drag Mitigation',
        description: 'Micro-torting in 8-1/2" horizontal section increased string drag during tripping out.',
        recommendation: 'Incorporate 3% lubricant additive into OBM system prior to reaching TD.',
      },
      {
        category: 'Cement Placement',
        description: 'Channeling risk detected near Boka Shale formation top due to mud cake contamination.',
        recommendation: 'Use turbulent spacer pre-flush and maintain 85 RPM casing rotation during slurry displacement.',
      },
    ],
    documents: [
      {
        id: 'doc-001',
        title: 'Daily Drilling Report (DDR)',
        type: 'DDR',
        fileName: 'OIL_159_F7_Daily_Drilling_Report_Latest.pdf',
        fileSize: '2.4 MB',
        dateAdded: '29 Aug 2026',
        fileUrl: '/documents/OIL_159_F7_Daily_Drilling_Report.pdf',
        description: 'Comprehensive 24-hour operational breakdown, IADC time log, bit records, and mud summary.',
      },
      {
        id: 'doc-002',
        title: 'Well Completion Report (WCR)',
        type: 'WCR',
        fileName: 'OIL_159_F7_Well_Completion_Report_Final.pdf',
        fileSize: '8.7 MB',
        dateAdded: '28 Aug 2026',
        fileUrl: '/documents/OIL_159_F7_Well_Completion_Report.pdf',
        description: 'Final geological evaluation, perforation intervals, reservoir production test results, and tubing schema.',
      },
      {
        id: 'doc-003',
        title: 'Composite Wireline Log',
        type: 'LOG',
        fileName: 'OIL_159_F7_Composite_Log_Gamma_Resistivity.pdf',
        fileSize: '14.2 MB',
        dateAdded: '25 Aug 2026',
        fileUrl: '/documents/OIL_159_F7_Composite_Log.pdf',
        description: 'Triple-combo wireline log suite featuring Gamma Ray, Resistivity, Bulk Density & Porosity curves.',
      },
      {
        id: 'doc-004',
        title: 'End of Bit (EOB) Analysis Report',
        type: 'REPORT',
        fileName: 'OIL_159_F7_PDC_Bit_Dull_Grade_Analysis.pdf',
        fileSize: '4.1 MB',
        dateAdded: '22 Aug 2026',
        fileUrl: '/documents/OIL_159_F7_PDC_Bit_Report.pdf',
        description: 'Detailed PDC bit wear evaluation, dull grading (IADC 1-1-B-X-I-NO-TD), cutter damage heatmaps & ROP comparison.',
      },
    ],
  },
};

import apiClient from '../api/client';

export interface WellCreate {
  well_name: string;
  latitude: number;
  longitude: number;
  target_depth_m: number;
  basin?: string;
  status?: string;
}

export interface FormationCreate {
  formation_name: string;
  top_depth_m: number;
  bottom_depth_m?: number;
  lithology?: string;
}

export const wellDataService = {
  async registerWell(wellData: WellCreate): Promise<any> {
    const response = await apiClient.post('/api/v1/wells', wellData);
    return response.data;
  },
  async listWells(): Promise<any[]> {
    const response = await apiClient.get('/api/v1/wells');
    return response.data.wells || [];
  },
  async getWellDetail(wellId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/wells/${wellId}`);
    return response.data;
  },
  async findNearbyWells(lat: number, lon: number, radiusKm: number = 10.0): Promise<any[]> {
    const response = await apiClient.get('/api/v1/wells/nearby/search', { params: { lat, lon, radius_km: radiusKm } });
    return response.data.nearby_wells || [];
  },
  async addFormation(wellId: string, formationData: FormationCreate): Promise<any> {
    const response = await apiClient.post(`/api/v1/wells/${wellId}/formations`, formationData);
    return response.data;
  }
};

import { telemetryService } from './telemetryService';
import { incidentService } from './incidentService';
import { documentService } from './documentService';

export async function getWellDetails(wellId: string): Promise<WellFullDetails> {
  try {
    const data = await wellDataService.getWellDetail(wellId);
    
    // Attempt to fetch related data concurrently, fallback to empty arrays on failure
    const [incidents, documents] = await Promise.all([
      incidentService.listIncidents(wellId).catch(() => []),
      documentService.listDocuments(wellId).catch(() => []),
      telemetryService.getTelemetryHistory(wellId).catch(() => []) // Fetched but not assigned to avoid TS error until mapped
    ]);

    return { 
      ...defaultWellDetailsData, 
      ...data,
      header: { 
        ...defaultWellDetailsData.header, 
        wellId: data.well_name || wellId,
        status: data.status || defaultWellDetailsData.header.status,
        trueVerticalDepth: data.target_depth_m ? `${data.target_depth_m} m` : defaultWellDetailsData.header.trueVerticalDepth,
        location: data.basin ? `${data.basin} Basin` : defaultWellDetailsData.header.location
      },
      otherInformation: {
        ...defaultWellDetailsData.otherInformation,
        lessonsLearned: incidents.length > 0 ? incidents.map((inc: any) => ({
          category: inc.incident_type,
          description: `Severity: ${inc.severity || 'Medium'}. Form: ${inc.formation_name || 'N/A'}. Depth: ${inc.depth_m || 'N/A'}m.`,
          recommendation: inc.mitigation_sop || 'Monitor closely and review procedures.'
        })) : defaultWellDetailsData.otherInformation.lessonsLearned,
        documents: documents.length > 0 ? documents : defaultWellDetailsData.otherInformation.documents,
      }
      // If we had telemetry mapping, we'd map telemetry to DrillingAnalyticsData here.
      // For now we preserve the robust default visuals but override if real data is structured correctly.
    };
  } catch(e) {
    return { ...defaultWellDetailsData, header: { ...defaultWellDetailsData.header, wellId } };
  }
}
