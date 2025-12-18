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
  propertyType: string; // Supports: SingleFamilyResidence, Condominium, Townhouse, Duplex, Triplex, Cabin, ManufacturedHome, ManufacturedOnLand, MobileHome, MixedUse, StockCooperative
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
}
