'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface MapViewProps {
  properties: MapProperty[];
  onMarkerClick: (property: MapProperty) => void;
  onBoundsChange: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void;
  selectedPropertyId?: string | null;
}

// Fix Leaflet default icon issue in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

export default function MapView({ properties, onMarkerClick, onBoundsChange, selectedPropertyId }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasInitialFitRef = useRef(false);
  const previousPropertiesLengthRef = useRef(0);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create map centered on California
    const map = L.map(containerRef.current, {
      center: [34.0522, -118.2437], // Los Angeles, CA
      zoom: 10,
      zoomControl: true,
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setIsMapReady(true);

    // Initial bounds change
    const bounds = map.getBounds();
    onBoundsChange({
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    });

    // Handle map move/zoom with debounce
    let debounceTimer: NodeJS.Timeout;
    const handleMoveEnd = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const currentBounds = map.getBounds();
        onBoundsChange({
          minLat: currentBounds.getSouth(),
          maxLat: currentBounds.getNorth(),
          minLng: currentBounds.getWest(),
          maxLng: currentBounds.getEast(),
        });
      }, 300);
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      clearTimeout(debounceTimer);
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [onBoundsChange]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Create new markers
    properties.forEach(property => {
      const marker = L.marker([property.lat, property.lng], {
        icon: L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      });

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px; font-family: Arial, sans-serif;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${property.address || 'Address not available'}</div>
          <div style="color: #666; font-size: 12px; margin-bottom: 8px;">${property.city}, ${property.state} ${property.zip}</div>
          <div style="font-size: 16px; font-weight: bold; color: #2563eb; margin-bottom: 8px;">$${property.price.toLocaleString()}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            ${property.beds} bed${property.beds !== 1 ? 's' : ''} • ${property.baths} bath${property.baths !== 1 ? 's' : ''}${property.sqft ? ` • ${property.sqft.toLocaleString()} sqft` : ''}
          </div>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('map-quick-view', { detail: '${property.id}' }))"
            style="width: 100%; padding: 6px 12px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;"
            onmouseover="this.style.background='#1d4ed8'"
            onmouseout="this.style.background='#2563eb'"
          >
            Quick View
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      
      // Handle marker click
      marker.on('click', () => {
        onMarkerClick(property);
      });

      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Only fit bounds on initial load (when properties first appear or significantly change)
    // Don't reset view when properties update due to pan/zoom
    const isInitialLoad = !hasInitialFitRef.current && properties.length > 0;
    const isSignificantChange = Math.abs(properties.length - previousPropertiesLengthRef.current) > properties.length * 0.5;
    
    if (isInitialLoad || (isSignificantChange && !hasInitialFitRef.current)) {
      const group = new L.FeatureGroup(markersRef.current);
      if (markersRef.current.length === 1) {
        map.setView([properties[0].lat, properties[0].lng], 15);
        hasInitialFitRef.current = true;
      } else if (markersRef.current.length > 1) {
        map.fitBounds(group.getBounds().pad(0.1));
        hasInitialFitRef.current = true;
      }
    }
    
    previousPropertiesLengthRef.current = properties.length;
    
    // If there's a selected property, ensure its popup is open
    if (selectedPropertyId) {
      const selectedProperty = properties.find(p => p.id === selectedPropertyId);
      if (selectedProperty) {
        const marker = markersRef.current.find(m => {
          const latlng = m.getLatLng();
          return Math.abs(latlng.lat - selectedProperty.lat) < 0.0001 && Math.abs(latlng.lng - selectedProperty.lng) < 0.0001;
        });
        if (marker) {
          marker.openPopup();
        }
      }
    }
  }, [properties, isMapReady, onMarkerClick, selectedPropertyId]);

  // Handle quick view from popup button
  useEffect(() => {
    const handleQuickView = (e: CustomEvent<string>) => {
      const property = properties.find(p => p.id === e.detail);
      if (property) {
        onMarkerClick(property);
      }
    };

    window.addEventListener('map-quick-view' as any, handleQuickView as EventListener);
    return () => {
      window.removeEventListener('map-quick-view' as any, handleQuickView as EventListener);
    };
  }, [properties, onMarkerClick]);

  // Pan to selected property (only when selectedPropertyId is set, not when it becomes null)
  useEffect(() => {
    if (!mapRef.current || !selectedPropertyId) {
      // When selectedPropertyId becomes null (quick view closes), preserve current viewport
      // Don't do anything - just keep the map where it is
      return;
    }
    
    const property = properties.find(p => p.id === selectedPropertyId);
    if (property) {
      // Only pan if we're not already close to this property
      const currentCenter = mapRef.current.getCenter();
      const distance = currentCenter.distanceTo([property.lat, property.lng]);
      
      // If property is more than 1km away, pan to it; otherwise just open popup
      if (distance > 1000) {
        mapRef.current.setView([property.lat, property.lng], Math.max(mapRef.current.getZoom(), 15));
      }
      
      const marker = markersRef.current.find(m => {
        const latlng = m.getLatLng();
        return Math.abs(latlng.lat - property.lat) < 0.0001 && Math.abs(latlng.lng - property.lng) < 0.0001;
      });
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedPropertyId, properties]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[400px]"
      style={{ zIndex: 0, touchAction: 'none' }}
    />
  );
}

