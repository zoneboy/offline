import * as tmImage from '@teachablemachine/image';
import { PredictionResult } from '../types';

// Define the shape of the model provided by the library
interface CustomMobileNet {
  getTotalClasses: () => number;
  getClassLabels: () => string[];
  predict: (input: HTMLVideoElement | HTMLCanvasElement) => Promise<{ className: string; probability: number }[]>;
}

let model: CustomMobileNet | null = null;

/**
 * Loads the Teachable Machine image model.
 */
export const loadModel = async (modelUrl: string, metadataUrl: string): Promise<void> => {
  try {
    // tmImage.load is a convenience function from @teachablemachine/image
    model = await tmImage.load(modelUrl, metadataUrl);
  } catch (error) {
    console.error("Failed to load model:", error);
    throw new Error("Could not load the scanner model.");
  }
};

/**
 * Runs a prediction on the provided video element.
 */
export const predict = async (videoElement: HTMLVideoElement): Promise<PredictionResult[]> => {
  if (!model) {
    return [];
  }
  // predict returns an array of probability objects
  const prediction = await model.predict(videoElement);
  return prediction;
};

/**
 * Checks if the model is loaded.
 */
export const isModelLoaded = (): boolean => {
  return !!model;
};