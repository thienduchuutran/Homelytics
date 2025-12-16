'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FavoriteButton from './FavoriteButton';
import FavoritesLink from './FavoritesLink';

export interface PropertyDetail {
  id: string;
  listingId: string | null;
  displayId: string | null;
  title: string;
  address: string;
  addressStreet: string | null;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  bathroomsHalf: number | null;
  squareFeet: number;
  propertyType: string;
  propertySubType: string | null;
  status: 'for-sale' | 'for-rent';
  description: string;
  images: string[];
  imageUrl: string;
  yearBuilt: number | null;
  parking: number | null;
  openParkingSpaces: number | null;
  amenities: string[];
  listingDate: string;
  latitude: number | null;
  longitude: number | null;
  subdivisionName: string | null;
  lotSizeArea: string | null;
  lotSizeAcres: number | null;
  lotSizeSquareFeet: number | null;
  levels: string | null;
  storiesTotal: number | null;
  cooling: string | null;
  heating: string | null;
  roof: string | null;
  flooring: string | null;
  view: string | null;
  interiorFeatures: string | null;
  lotFeatures: string | null;
  patioAndPorchFeatures: string | null;
  poolFeatures: string | null;
  fireplaceFeatures: string | null;
  appliances: string | null;
  securityFeatures: string | null;
  communityFeatures: string | null;
  associationAmenities: string | null;
  spaFeatures: string | null;
  fencing: string | null;
  architecturalStyle: string | null;
  structureType: string | null;
  propertyCondition: string | null;
  numberOfUnitsTotal: number | null;
  mainLevelBedrooms: number | null;
  daysOnMarket: number | null;
  associationFee: number | null;
  associationFeeFrequency: string | null;
  highSchoolDistrict: string | null;
  countyOrParish: string | null;
  agentFirstName: string | null;
  agentLastName: string | null;
  agentFullName: string | null;
  officeName: string | null;
  agentEmail: string | null;
  agentPhone: string | null;
  officeEmail: string | null;
  modificationTimestamp: string | null;
  onMarketDate: string | null;
  backOnMarketDate: string | null;
  priceChangeTimestamp: string | null;
  statusChangeTimestamp: string | null;
}

interface PropertyDetailViewProps {
  propertyId: string | null;
  showHeader?: boolean;
  showFullPageLink?: boolean;
}

export default function PropertyDetailView({ propertyId, showHeader = true, showFullPageLink = false }: PropertyDetailViewProps) {
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        setError('Property ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = `https://titus-duc.calisearch.org/api/get_property.php?id=${encodeURIComponent(propertyId)}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Property not found');
          }
          const text = await response.text();
          throw new Error(`Failed to fetch property: ${response.status} ${response.statusText} | ${text}`);
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        setProperty(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property');
        console.error('Error fetching property:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  const formatPrice = (price: number) => {
    if (property?.status === 'for-rent') {
      return `$${price.toLocaleString()}/mo`;
    }
    return `$${price.toLocaleString()}`;
  };

  const getPropertyTypeDisplay = (propertyType: string): string => {
    const displayMap: Record<string, string> = {
      'Residential': 'Residential',
      'SingleFamilyResidence': 'Single Family',
      'Condominium': 'Condominium',
      'Townhouse': 'Townhouse',
      'Duplex': 'Duplex',
      'Triplex': 'Triplex',
      'Cabin': 'Cabin',
      'ManufacturedHome': 'Manufactured Home',
      'ManufacturedOnLand': 'Manufactured On Land',
      'MobileHome': 'Mobile Home',
      'MixedUse': 'Mixed Use',
      'StockCooperative': 'Stock Cooperative',
    };
    return displayMap[propertyType] || propertyType;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (!propertyId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Property ID Required</h3>
          <p className="text-gray-600 mb-6">Please provide a property ID.</p>
          {showHeader && (
            <Link
              href="/houses"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Back to Listings
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {showHeader && (
          <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="skeleton h-6 w-32 rounded"></div>
            </div>
          </header>
        )}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Image Skeleton */}
          <div className="mb-8">
            <div className="skeleton h-[500px] w-full rounded-2xl mb-4"></div>
            <div className="grid grid-cols-6 gap-2">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="skeleton h-20 rounded-lg"></div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column Skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="skeleton h-10 w-3/4 mb-4 rounded"></div>
                <div className="skeleton h-6 w-1/2 mb-2 rounded"></div>
                <div className="skeleton h-6 w-1/3 mb-6 rounded"></div>
                <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-200">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="text-center">
                      <div className="skeleton h-8 w-12 mx-auto mb-2 rounded"></div>
                      <div className="skeleton h-4 w-16 mx-auto rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="skeleton h-8 w-32 mb-4 rounded"></div>
                <div className="skeleton h-4 w-full mb-2 rounded"></div>
                <div className="skeleton h-4 w-full mb-2 rounded"></div>
                <div className="skeleton h-4 w-3/4 rounded"></div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <div className="skeleton h-8 w-40 mb-6 rounded"></div>
                <div className="grid grid-cols-2 gap-6">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx}>
                      <div className="skeleton h-4 w-24 mb-2 rounded"></div>
                      <div className="skeleton h-6 w-32 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column Skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
                <div className="skeleton h-8 w-48 mb-4 rounded"></div>
                <div className="skeleton h-6 w-32 mb-2 rounded"></div>
                <div className="skeleton h-6 w-40 mb-6 rounded"></div>
                <div className="skeleton h-12 w-full mb-3 rounded-lg"></div>
                <div className="skeleton h-12 w-full rounded-lg"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <svg
            className="mx-auto h-24 w-24 text-red-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Error loading property</h3>
          <p className="text-gray-600 mb-6">{error || 'Property not found'}</p>
          {showHeader && (
            <Link
              href="/houses"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Back to Listings
            </Link>
          )}
        </div>
      </div>
    );
  }

  const images = property.images && property.images.length > 0 ? property.images : [property.imageUrl];
  const currentImage = images[selectedImageIndex] || property.imageUrl;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {showHeader && (
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <Link
                href="/houses"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Listings
              </Link>
              <FavoritesLink />
            </div>
          </div>
        </header>
      )}

      {/* Full Page Link (for drawer) */}
      {showFullPageLink && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Link
            href={`/properties?id=${property.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open full page
          </Link>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Image Gallery */}
        <div className="mb-8">
          <div className="relative h-[500px] w-full rounded-2xl overflow-hidden bg-gray-200 mb-4">
            <Image
              src={currentImage}
              alt={property.title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  {selectedImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>
          
          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="grid grid-cols-6 gap-2">
              {images.slice(0, 6).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIndex === idx ? 'border-blue-600 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`Property image ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 16vw, 10vw"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2">
            {/* Title and Price */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h1 className="text-4xl font-bold text-gray-900 mb-2">{property.title}</h1>
                      <p className="text-xl text-gray-600 mb-1">{property.address}</p>
                      <p className="text-lg text-gray-500">
                        {property.city}, {property.state} {property.zipCode}
                      </p>
                    </div>
                    <FavoriteButton
                      id={property.id}
                      snapshot={{
                        address: property.address,
                        city: property.city,
                        state: property.state,
                        zip: property.zipCode,
                        price: property.price,
                        beds: property.bedrooms,
                        baths: property.bathrooms,
                        sqft: property.squareFeet,
                        photo: property.imageUrl,
                      }}
                      className="flex-shrink-0"
                      size="lg"
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <p className="text-4xl font-bold text-blue-600 mb-2">{formatPrice(property.price)}</p>
                  <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                    property.status === 'for-sale' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {property.status === 'for-sale' ? 'For Sale' : 'For Rent'}
                  </span>
                </div>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-2xl font-bold text-gray-900">{property.bedrooms}</span>
                  </div>
                  <p className="text-sm text-gray-500">Bedrooms</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    <span className="text-2xl font-bold text-gray-900">
                      {property.bathrooms}
                      {property.bathroomsHalf ? `.${property.bathroomsHalf}` : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Bathrooms</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span className="text-2xl font-bold text-gray-900">{property.squareFeet.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-500">Square Feet</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-2xl font-bold text-gray-900">
                      {property.parking || property.openParkingSpaces || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">Parking</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {property.propertyType && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Property Type</h3>
                    <p className="text-lg text-gray-900">{getPropertyTypeDisplay(property.propertyType)}</p>
                  </div>
                )}
                {property.yearBuilt && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Year Built</h3>
                    <p className="text-lg text-gray-900">{property.yearBuilt}</p>
                  </div>
                )}
                {property.lotSizeSquareFeet && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Lot Size</h3>
                    <p className="text-lg text-gray-900">
                      {property.lotSizeSquareFeet.toLocaleString()} sq ft
                      {property.lotSizeAcres && ` (${property.lotSizeAcres.toFixed(2)} acres)`}
                    </p>
                  </div>
                )}
                {property.storiesTotal && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Stories</h3>
                    <p className="text-lg text-gray-900">{property.storiesTotal}</p>
                  </div>
                )}
                {property.daysOnMarket !== null && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Days on Market</h3>
                    <p className="text-lg text-gray-900">{property.daysOnMarket}</p>
                  </div>
                )}
                {property.listingDate && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Listed</h3>
                    <p className="text-lg text-gray-900">{formatDate(property.listingDate)}</p>
                  </div>
                )}
                {property.subdivisionName && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Subdivision</h3>
                    <p className="text-lg text-gray-900">{property.subdivisionName}</p>
                  </div>
                )}
                {property.countyOrParish && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">County</h3>
                    <p className="text-lg text-gray-900">{property.countyOrParish}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            {(property.interiorFeatures || property.lotFeatures || 
              property.appliances || property.cooling || property.heating || property.roof || 
              property.flooring) && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Features</h2>
                <div className="space-y-6">
                  {property.cooling && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Cooling</h3>
                      <p className="text-gray-700">{property.cooling}</p>
                    </div>
                  )}
                  {property.heating && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Heating</h3>
                      <p className="text-gray-700">{property.heating}</p>
                    </div>
                  )}
                  {property.roof && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Roof</h3>
                      <p className="text-gray-700">{property.roof}</p>
                    </div>
                  )}
                  {property.flooring && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Flooring</h3>
                      <p className="text-gray-700">{property.flooring}</p>
                    </div>
                  )}
                  {property.interiorFeatures && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Interior Features</h3>
                      <p className="text-gray-700">{property.interiorFeatures}</p>
                    </div>
                  )}
                  {property.lotFeatures && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Lot Features</h3>
                      <p className="text-gray-700">{property.lotFeatures}</p>
                    </div>
                  )}
                  {property.appliances && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Appliances</h3>
                      <p className="text-gray-700">{property.appliances}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenities</h2>
                <div className="flex flex-wrap gap-3">
                  {property.amenities.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-1">
            {/* Contact Card */}
            {(property.agentFullName || property.officeName || property.agentPhone || property.agentEmail) && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 sticky top-24">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
                {property.agentFullName && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{property.agentFullName}</h3>
                    {property.officeName && (
                      <p className="text-gray-600">{property.officeName}</p>
                    )}
                  </div>
                )}
                {property.agentPhone && (
                  <a
                    href={`tel:${property.agentPhone}`}
                    className="block w-full mb-3 px-4 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call Agent
                  </a>
                )}
                {property.agentEmail && (
                  <a
                    href={`mailto:${property.agentEmail}`}
                    className="block w-full px-4 py-3 border-2 border-blue-600 text-blue-600 text-center rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                  >
                    <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email Agent
                  </a>
                )}
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
              <div className="space-y-4">
                {property.listingId && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Listing ID</h3>
                    <p className="text-gray-900">{property.listingId}</p>
                  </div>
                )}
                {property.displayId && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">MLS Number</h3>
                    <p className="text-gray-900">{property.displayId}</p>
                  </div>
                )}
                {property.associationFee !== null && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">HOA Fee</h3>
                    <p className="text-gray-900">
                      ${property.associationFee.toLocaleString()}
                      {property.associationFeeFrequency && `/${property.associationFeeFrequency}`}
                    </p>
                  </div>
                )}
                {property.highSchoolDistrict && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">School District</h3>
                    <p className="text-gray-900">{property.highSchoolDistrict}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

