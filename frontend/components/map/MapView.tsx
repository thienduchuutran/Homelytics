'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  hoveredPropertyId?: string | null;
}

type PriceTier = 'low' | 'mid' | 'high';

// Tier colors: below median (blue), near median (purple), above median (red).
// Chosen to pop against OpenStreetMap's beige/green/tan tiles — the default
// green/amber blended into parks and road casings.
const TIER_COLORS: Record<PriceTier, string> = {
  low: '#2563eb',
  mid: '#a855f7',
  high: '#ef4444',
};

const TIER_LABELS: Record<PriceTier, string> = {
  low: 'Below median',
  mid: 'Near median',
  high: 'Above median',
};

// Rank-based tertiles so colors balance across the current viewport
// rather than being skewed by price outliers.
function computePriceTiers(properties: MapProperty[]): Map<string, PriceTier> {
  const tiers = new Map<string, PriceTier>();
  if (properties.length === 0) return tiers;

  const prices = properties.map(p => p.price).sort((a, b) => a - b);
  const t1 = prices[Math.floor(prices.length / 3)];
  const t2 = prices[Math.floor((prices.length * 2) / 3)];

  properties.forEach(p => {
    if (p.price < t1) tiers.set(p.id, 'low');
    else if (p.price < t2) tiers.set(p.id, 'mid');
    else tiers.set(p.id, 'high');
  });

  return tiers;
}

function applyMarkerStyle(
  marker: L.CircleMarker,
  state: 'normal' | 'hovered' | 'selected',
  fillColor: string,
) {
  switch (state) {
    case 'selected':
      marker.setStyle({
        radius: 14,
        weight: 3,
        color: '#ffffff',
        fillColor,
        fillOpacity: 1.0,
      });
      marker.bringToFront();
      break;
    case 'hovered':
      marker.setStyle({
        radius: 12,
        weight: 1.5,
        color: '#ffffff',
        fillColor,
        fillOpacity: 1.0,
      });
      marker.bringToFront();
      break;
    case 'normal':
    default:
      marker.setStyle({
        radius: 8,
        weight: 1.5,
        color: '#ffffff',
        fillColor,
        fillOpacity: 0.8,
      });
      break;
  }
}

export default function MapView({ properties, onMarkerClick, onBoundsChange, selectedPropertyId, hoveredPropertyId }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const markersMapRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const markerTiersRef = useRef<Map<string, PriceTier>>(new Map());
  const legendRef = useRef<L.Control | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Mirror props into refs so leaflet event handlers (which outlive React renders)
  // always see the latest selection/hover state.
  const selectedIdRef = useRef<string | null | undefined>(selectedPropertyId);
  const hoveredIdRef = useRef<string | null | undefined>(hoveredPropertyId);
  useEffect(() => { selectedIdRef.current = selectedPropertyId; }, [selectedPropertyId]);
  useEffect(() => { hoveredIdRef.current = hoveredPropertyId; }, [hoveredPropertyId]);

  // Initialize map + price legend
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [34.0522, -118.2437], // Los Angeles, CA
      // Start at neighborhood zoom (≈12) rather than full-metro (10) so the first
      // paint isn't 300+ pins stacked on top of each other.
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const legend = new L.Control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'homelytics-price-legend');
      div.style.cssText = [
        'background: rgba(255, 255, 255, 0.96)',
        'padding: 10px 12px',
        'border-radius: 8px',
        'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15)',
        'font-family: system-ui, -apple-system, Arial, sans-serif',
        'font-size: 12px',
        'line-height: 1.7',
        'color: #374151',
        'min-width: 140px',
      ].join(';');
      const dot = (color: string) => `
        <span style="
          display:inline-block;width:12px;height:12px;border-radius:50%;
          background:${color};border:1.5px solid #ffffff;
          box-shadow:0 0 0 1px rgba(0,0,0,0.08);flex-shrink:0;
        "></span>`;
      div.innerHTML = `
        <div style="font-weight:600;margin-bottom:4px;color:#111827;">Price tier</div>
        <div style="display:flex;align-items:center;gap:8px;">${dot(TIER_COLORS.low)}${TIER_LABELS.low}</div>
        <div style="display:flex;align-items:center;gap:8px;">${dot(TIER_COLORS.mid)}${TIER_LABELS.mid}</div>
        <div style="display:flex;align-items:center;gap:8px;">${dot(TIER_COLORS.high)}${TIER_LABELS.high}</div>
      `;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    };
    legend.addTo(map);
    legendRef.current = legend;

    mapRef.current = map;
    setIsMapReady(true);

    const bounds = map.getBounds();
    onBoundsChange({
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
    });

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

  const priceTiers = useMemo(() => computePriceTiers(properties), [properties]);

  // Create/recreate markers when properties or tier assignments change.
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    const map = mapRef.current;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    markersMapRef.current.clear();
    markerTiersRef.current.clear();

    properties.forEach(property => {
      const tier = priceTiers.get(property.id) ?? 'mid';
      const fillColor = TIER_COLORS[tier];

      const marker = L.circleMarker([property.lat, property.lng], {
        radius: 8,
        weight: 1.5,
        color: '#ffffff',
        fillColor,
        fillOpacity: 0.8,
      });

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

      marker.on('click', () => {
        onMarkerClick(property);
      });

      marker.on('mouseover', () => {
        if (selectedIdRef.current === property.id) return;
        applyMarkerStyle(marker, 'hovered', fillColor);
      });
      marker.on('mouseout', () => {
        if (selectedIdRef.current === property.id) return;
        if (hoveredIdRef.current === property.id) return;
        applyMarkerStyle(marker, 'normal', fillColor);
      });

      marker.addTo(map);
      markersRef.current.push(marker);
      markersMapRef.current.set(property.id, marker);
      markerTiersRef.current.set(property.id, tier);

      // Carry selection/hover state over to freshly created markers.
      if (selectedIdRef.current === property.id) {
        applyMarkerStyle(marker, 'selected', fillColor);
      } else if (hoveredIdRef.current === property.id) {
        applyMarkerStyle(marker, 'hovered', fillColor);
      }
    });

    // No auto-fit-to-markers here on purpose. With pagination, MapView only
    // ever receives ~15 pins at a time, and fitting to a random time-sorted
    // slice would produce a jumpy, unpredictable initial zoom. The default
    // center/zoom on map init is the single source of truth for viewport.

    if (selectedIdRef.current) {
      const marker = markersMapRef.current.get(selectedIdRef.current);
      if (marker) {
        marker.openPopup();
      }
    }
  }, [properties, isMapReady, priceTiers, onMarkerClick]);

  // Handle quick view from popup button
  useEffect(() => {
    const handleQuickView = (e: CustomEvent<string>) => {
      const property = properties.find(p => p.id === e.detail);
      if (property) {
        onMarkerClick(property);
      }
    };

    window.addEventListener('map-quick-view', handleQuickView as EventListener);
    return () => {
      window.removeEventListener('map-quick-view', handleQuickView as EventListener);
    };
  }, [properties, onMarkerClick]);

  // Sync marker visuals when selection or list-hover changes.
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    markersMapRef.current.forEach((marker, propertyId) => {
      const tier = markerTiersRef.current.get(propertyId) ?? 'mid';
      const fillColor = TIER_COLORS[tier];

      if (selectedPropertyId === propertyId) {
        applyMarkerStyle(marker, 'selected', fillColor);
      } else if (hoveredPropertyId === propertyId) {
        applyMarkerStyle(marker, 'hovered', fillColor);
      } else {
        applyMarkerStyle(marker, 'normal', fillColor);
      }
    });
  }, [selectedPropertyId, hoveredPropertyId, isMapReady]);

  // Pan to selected property (only when selectedPropertyId is set, not when it becomes null)
  useEffect(() => {
    if (!mapRef.current || !selectedPropertyId) {
      // When selectedPropertyId becomes null (quick view closes), preserve current viewport
      return;
    }

    const property = properties.find(p => p.id === selectedPropertyId);
    if (property) {
      const currentCenter = mapRef.current.getCenter();
      const distance = currentCenter.distanceTo([property.lat, property.lng]);

      // If property is more than 1km away, pan to it; otherwise just open popup
      if (distance > 1000) {
        mapRef.current.setView([property.lat, property.lng], Math.max(mapRef.current.getZoom(), 15));
      }

      const marker = markersMapRef.current.get(selectedPropertyId);
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
