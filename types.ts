// Patient and Study Data Types

export enum SurgeryGroup {
  TFG = 'Tympanomeatal Flap Elevation',
  NTFG = 'Non-Elevation',
}

export interface Frequencies {
  f500: number;
  f1k: number;
  f2k: number;
  f4k: number;
  avg?: number;
}

export interface EarData {
  airConduction: Frequencies;
  boneConduction: Frequencies;
  airBoneGap?: number; // Calculated
}

export interface AudiometryResult {
  right: EarData;
  left: EarData;
  imageUrl?: string; // URL from Supabase Storage
}

export interface OtoscopyFindings {
  perforationSize: string;
  quadrant: string;
  graftUptake?: 'Uptake' | 'Fail';
}

export interface Patient {
  id: string;
  // Demographics
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  address: string;
  religion: string;
  education: string;
  bmi: number;

  // Clinical
  operationDate?: string; // ISO Date String YYYY-MM-DD
  operatedEar: 'Right' | 'Left'; // New field
  group: SurgeryGroup; // TFG or NTFG
  diagnosis: string;

  // Pre-Op
  preOpOtoscopy: {
    right: OtoscopyFindings;
    left: OtoscopyFindings;
  };
  preOpAudiometry: AudiometryResult;

  // Post-Op 6 Weeks
  postOp6WeeksOtoscopy: {
    right: OtoscopyFindings;
    left: OtoscopyFindings;
  };
  postOp6WeeksAudiometry: AudiometryResult;

  // Post-Op 12 Weeks
  postOp12WeeksOtoscopy: {
    right: OtoscopyFindings;
    left: OtoscopyFindings;
  };
  postOp12WeeksAudiometry: AudiometryResult;
}

export const createInitialFrequencies = (): Frequencies => ({ f500: 0, f1k: 0, f2k: 0, f4k: 0, avg: 0 });
export const createInitialEarData = (): EarData => ({ airConduction: createInitialFrequencies(), boneConduction: createInitialFrequencies(), airBoneGap: 0 });
export const createInitialAudiometry = (): AudiometryResult => ({ right: createInitialEarData(), left: createInitialEarData() });
export const createInitialOtoscopy = (): OtoscopyFindings => ({ perforationSize: '', quadrant: '' });

// Keep constants for backward compatibility if needed, but they are dangerous if mutated.
// Better to remove them and update usage.
export const INITIAL_FREQUENCIES = createInitialFrequencies();
export const INITIAL_EAR_DATA = createInitialEarData();
export const INITIAL_AUDIOMETRY = createInitialAudiometry();
export const INITIAL_OTOSCOPY = createInitialOtoscopy();

// Helper to calculate averages
export const calculateAverage = (freq: Frequencies): number => {
  return (freq.f500 + freq.f1k + freq.f2k + freq.f4k) / 4;
};

// Helper to calculate ABG
export const calculateABG = (ac: number, bc: number): number => {
  return ac - bc;
};