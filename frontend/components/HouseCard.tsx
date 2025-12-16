import { House } from '@/types/house';
import Image from 'next/image';
import Link from 'next/link';

interface HouseCardProps {
  house: House;
}

export default function HouseCard({ house }: HouseCardProps) {
  const formatPrice = (price: number) => {
    if (house.status === 'for-rent') {
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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="relative h-64 w-full">
        <Image
          src={house.imageUrl}
          alt={house.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
          {house.status === 'for-sale' ? 'For Sale' : 'For Rent'}
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{house.title}</h3>
        <p className="text-gray-600 mb-2">{house.address}</p>
        <p className="text-gray-600 mb-4">
          {house.city}, {house.state} {house.zipCode}
        </p>

        <div className="mb-4">
          <p className="text-3xl font-bold text-blue-600">{formatPrice(house.price)}</p>
        </div>

        <div className="flex items-center gap-4 mb-4 text-gray-700">
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>{house.bedrooms} beds</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <span>{house.bathrooms} baths</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>{house.squareFeet.toLocaleString()} sqft</span>
          </div>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2">{house.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
            {getPropertyTypeDisplay(house.propertyType)}
          </span>
          {house.parking && (
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              {house.parking} Parking
            </span>
          )}
        </div>

        <Link
          href={`/properties?id=${house.id}`}
          className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
