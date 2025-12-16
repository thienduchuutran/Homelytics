'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PropertyDetailView from '@/components/PropertyDetailView';

function PropertyDetailContent() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('id');

  return <PropertyDetailView propertyId={propertyId} showHeader={true} showFullPageLink={false} />;
}

export default function PropertyDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PropertyDetailContent />
    </Suspense>
  );
}
