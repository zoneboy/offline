import { PriceInfo } from './types';

// INSTRUCTIONS:
// 1. Open 'my_model/metadata.json' and look at the "labels" array.
// 2. Copy those exact strings and use them as keys (the left side) below.
// 3. Set the name, price, and category for each item.

export const PRICE_MAPPING: Record<string, PriceInfo> = {
  // Key from metadata.json      // Display Info
  'Hollandia Evap 120g': {
    name: 'Hollandia Evaporated Milk (120g)',
    price: '₦500',
    category: 'Dairy'
  },
  'Beloxxi Cream cracker': {
    name: 'Beloxxi Cream Crackers',
    price: '₦50',
    category: 'Snacks'
  },
  'Hollandia 50g': {
    name: 'Hollandia Evaporated Milk (50g)',
    price: '₦250',
    category: 'Dairy'
  },
  'three crown triangle': {
    name: 'Three Crowns Milk (Sachet)',
    price: '₦300',
    category: 'Dairy'
  },
  // Example of a fallback if you add 'Class 1' to your model later
  'Class 1': {
    name: 'Generic Item',
    price: '₦0.00',
    category: 'Unknown'
  }
};

export const CONFIDENCE_THRESHOLD = 0.85; // 85% confidence required
export const MODEL_URL = './my_model/model.json';
export const METADATA_URL = './my_model/metadata.json';