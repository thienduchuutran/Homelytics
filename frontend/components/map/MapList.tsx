'use client';

import { useState } from 'react';

interface MapProperty {
  id: string;
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  photo: string;
  status: string;
  dom: number | null;
}

interface MapListProps {
  properties: MapProperty[];
  onPropertyClick: (property: MapProperty) => void;
  selectedPropertyId?: string | null;
  isLoading?: boolean;
}

export default function MapList({ properties, onPropertyClick, selectedPropertyId, isLoading }: MapListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
          <p className="text-sm text-gray-500 mt-1">Loading...</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="skeleton h-40 w-full rounded-lg mb-3"></div>
              <div className="skeleton h-4 w-3/4 mb-2"></div>
              <div className="skeleton h-4 w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
        <p className="text-sm text-gray-500 mt-1">
          Showing {properties.length} {properties.length === 1 ? 'home' : 'homes'} in view
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {properties.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-lg font-medium mb-2">No properties found</p>
            <p className="text-sm">Try adjusting the map view or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {properties.map((property) => {
              const isSelected = selectedPropertyId === property.id;
              const isHovered = hoveredId === property.id;

              return (
                <div
                  key={property.id}
                  onClick={() => onPropertyClick(property)}
                  onMouseEnter={() => setHoveredId(property.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                      : isHovered 
                        ? 'bg-gray-50' 
                        : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-200">
                      <img
                        src={property.photo}
                        alt={property.address}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800';
                        }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm mb-1 truncate">
                        {property.address || 'Address not available'}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {property.city}, {property.state} {property.zip}
                      </div>
                      <div className="text-lg font-bold text-blue-600 mb-1">
                        ${property.price.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">
                        {property.beds} bed{property.beds !== 1 ? 's' : ''} • {property.baths} bath{property.baths !== 1 ? 's' : ''}
                        {property.sqft ? ` • ${property.sqft.toLocaleString()} sqft` : ''}
                        {property.dom !== null ? ` • ${property.dom} DOM` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

