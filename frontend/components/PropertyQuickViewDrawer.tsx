'use client';

import { useEffect, useRef } from 'react';
import PropertyDetailView from './PropertyDetailView';

interface PropertyQuickViewDrawerProps {
  open: boolean;
  propertyId: string | null;
  onClose: () => void;
}

export default function PropertyQuickViewDrawer({ open, propertyId, onClose }: PropertyQuickViewDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Focus close button when drawer opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open, onClose]);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden"
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="drawer-title"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-full md:w-[90%] lg:w-[80%] xl:w-[70%] max-w-6xl bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
          <h2 id="drawer-title" className="text-lg font-semibold text-gray-900">
            Property Details
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close drawer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Content */}
        <div className="overflow-y-auto">
          <PropertyDetailView propertyId={propertyId} showHeader={false} showFullPageLink={true} />
        </div>
      </div>
    </div>
  );
}

