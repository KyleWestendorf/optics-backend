export interface Scope {
  minZoom: number;
  maxZoom: number;
  currentZoom: number;
  model: string;
  description: string;
  manufacturer: string;
  price: string;
  url: string;
  series: string;
  objectiveLens: number;
  reticle?: {
    type: string;
    description: string;
    svgPath?: string;
    imageUrl?: string;
  };
} 