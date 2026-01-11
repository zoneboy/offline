export interface PredictionResult {
  className: string;
  probability: number;
}

export enum AppStatus {
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED'
}

export interface PriceInfo {
  price: string;
  name: string;
  category?: string;
}