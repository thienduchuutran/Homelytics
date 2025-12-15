export interface House {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: 'house' | 'apartment' | 'condo' | 'townhouse';
  status: 'for-sale' | 'for-rent';
  description: string;
  imageUrl: string;
  yearBuilt: number | null;
  parking?: number;
  amenities: string[];
  listingDate: string;
}

export interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  status: string;
}
