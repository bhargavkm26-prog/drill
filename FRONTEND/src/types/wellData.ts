export interface WellHeaderData {
  wellId: string;
  status: 'Drilling' | 'Completed' | 'Suspended' | 'Planning';
  measuredDepth: string; // MD
  trueVerticalDepth: string; // TVD
  lastUpdated: string;
  location: string;
  rig: string;
  operator: string;
  spudDate: string;
  objective: string;
  isFavorite?: boolean;
}

export interface HydrocarbonSummary {
  depthFound: string; // e.g. "1,082.00 m"
  hydrocarbonType: string; // e.g. "Oil"
  payZoneThickness: string; // e.g. "12.50 m"
}

export interface FormationDetails {
  name: string; // e.g. "Upper Boka Sandstone"
  lithology: string; // e.g. "Sandstone with Shale Interbeds"
  age: string; // e.g. "Miocene"
}

export interface RiskAssessment {
  similarityScorePercentage: number; // e.g. 72
  chanceCategory: string; // e.g. "Moderate Chance"
  riskPoints: string[];
}

export interface FormationRiskSummary {
  hydrocarbon: HydrocarbonSummary;
  formation: FormationDetails;
  riskAssessment: RiskAssessment;
}

export interface OffsetEvent {
  id: string;
  wellId: string;
  distanceKm: number;
  events: string;
  formation: string;
  measuredDepth: number;
  trueVerticalDepth: number;
  eventType: 'Mud Loss' | 'Kick' | 'Stuck Pipe' | 'Cementing' | 'Casing Programs' | 'Formation Risks';
  severity: 'Low' | 'Moderate' | 'High';
  date: string;
}

export interface MdVsTvdSeries {
  md: number;
  'NO 15/9-F-4'?: number;
  'NO 15/9-F-7'?: number;
  'NO 15/9-F-9'?: number;
}

export interface FacetPoint {
  x: number;
  y: number;
}

export interface FacetWellSeries {
  wellId: 'NO 15/9-F-4' | 'NO 15/9-F-7' | 'NO 15/9-F-9';
  color: string;
  points: FacetPoint[];
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
}

export interface FacetChartConfig {
  title: string;
  yLabel: string;
  xLabel: string;
  yMin: number;
  yMax: number;
  xMin: number;
  xMax: number;
  yTicks: number[];
  xTicks: number[];
  series: FacetWellSeries[];
}

export interface DrillingAnalyticsData {
  mdVsTvd: MdVsTvdSeries[];
  rateOfTurn: FacetChartConfig;
  inclinationAzimuth: FacetChartConfig;
  rateOfBuild: FacetChartConfig;
}

export interface MudProgram {
  weight: string;
  type: string;
}

export interface CasingProgram {
  surfaceCasing: string;
  intermediateCasing: string;
  productionCasing?: string;
}

export interface CementingPractice {
  primaryLead: string;
  primaryTail: string;
  topOfCement: string;
}

export interface FormationTopItem {
  name: string;
  depth: string;
  isPayZone?: boolean;
}

export interface LessonLearnedItem {
  category: string;
  description: string;
  recommendation: string;
}

export interface WellDocumentItem {
  id: string;
  title: string;
  type: 'DDR' | 'WCR' | 'LOG' | 'REPORT';
  fileName: string;
  fileSize: string;
  dateAdded: string;
  fileUrl: string;
  description: string;
}

export interface OtherInformationData {
  mudProgram: MudProgram;
  casingProgram: CasingProgram;
  cementingPractice: CementingPractice;
  formationTops: FormationTopItem[];
  lessonsLearned?: LessonLearnedItem[];
  documents?: WellDocumentItem[];
}

export interface WellFullDetails {
  header: WellHeaderData;
  formationRisk: FormationRiskSummary;
  wellStructureImage: string;
  offsetEvents: OffsetEvent[];
  analytics: DrillingAnalyticsData;
  otherInformation: OtherInformationData;
}
