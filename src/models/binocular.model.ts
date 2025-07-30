export interface Binocular {
  magnification: number;
  objectiveLens: number;
  fieldOfView: number; // in degrees at 1000 yards
  exitPupil: number; // objectiveLens / magnification
  eyeRelief: number; // in mm
  closeFocus: number; // in feet
  weight: number; // in ounces
  prismType: 'Roof' | 'Porro';
  model: string;
  manufacturer: string;
  series: string;
  description: string;
  price: string;
  url: string;
  features: string[];
  useCase: string[];
  waterproof: boolean;
  fogproof: boolean;
  coatings: string;
  dimensions?: {
    length: number; // in inches
    width: number;
    height: number;
  };
}