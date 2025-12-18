'use client';

import { useState, useMemo, useRef } from 'react';
import { useFavorites } from '@/app/lib/useFavorites';
import Image from 'next/image';
import Link from 'next/link';
import ConfirmDialog from '@/components/ConfirmDialog';

type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high';

export default function FavoritesPage() {
  const { favorites, isReady, remove, updateNote, addTag, removeTag, exportFavorites, importFavorites } = useFavorites();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; propertyAddress?: string }>({
    open: false,
    id: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAndSorted = useMemo(() => {
    if (!isReady) return [];

    // Filter by search term
    let filtered = favorites;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = favorites.filter(fav => 
        fav.snapshot.address.toLowerCase().includes(search) ||
        fav.snapshot.city.toLowerCase().includes(search) ||
        fav.snapshot.zip.toLowerCase().includes(search) ||
        fav.snapshot.state.toLowerCase().includes(search) ||
        (fav.note && fav.note.toLowerCase().includes(search)) ||
        (fav.tags && fav.tags.some(tag => tag.toLowerCase().includes(search)))
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        case 'oldest':
          return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
        case 'price-low':
          return a.snapshot.price - b.snapshot.price;
        case 'price-high':
          return b.snapshot.price - a.snapshot.price;
        default:
          return 0;
      }
    });

    return sorted;
  }, [favorites, searchTerm, sortBy, isReady]);

  const selectedFavorites = useMemo(() => {
    return favorites.filter(fav => selectedForCompare.has(fav.id));
  }, [favorites, selectedForCompare]);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString()}`;
  };

  const handleRemove = (e: React.MouseEvent, id: string, propertyAddress?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirm({
      open: true,
      id,
      propertyAddress,
    });
  };

  const confirmRemove = () => {
    if (deleteConfirm.id) {
      remove(deleteConfirm.id);
      // Remove from compare selection if selected
      if (selectedForCompare.has(deleteConfirm.id)) {
        setSelectedForCompare(prev => {
          const next = new Set(prev);
          next.delete(deleteConfirm.id!);
          return next;
        });
      }
      setDeleteConfirm({ open: false, id: null });
    }
  };

  const cancelRemove = () => {
    setDeleteConfirm({ open: false, id: null });
  };

  const [compareLimitMessage, setCompareLimitMessage] = useState(false);

  const handleCompareToggle = (id: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setCompareLimitMessage(false);
      } else {
        if (next.size >= 3) {
          setCompareLimitMessage(true);
          setTimeout(() => setCompareLimitMessage(false), 3000);
          return prev;
        }
        next.add(id);
        setCompareLimitMessage(false);
      }
      return next;
    });
  };

  const handleNoteChange = (id: string, note: string) => {
    updateNote(id, note);
    setEditingNote(null);
  };

  const handleTagAdd = (id: string) => {
    const tag = newTagInputs[id]?.trim();
    if (tag) {
      addTag(id, tag);
      setNewTagInputs(prev => ({ ...prev, [id]: '' }));
    }
  };

  const handleExport = () => {
    const json = exportFavorites();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `favorites-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = event.target?.result as string;
        const result = importFavorites(jsonData);
        
        if (result.success) {
          setImportMessage({ type: 'success', text: result.message });
        } else {
          setImportMessage({ type: 'error', text: result.message });
        }
        
        // Clear message after 5 seconds
        setTimeout(() => setImportMessage(null), 5000);
      } catch {
        setImportMessage({ type: 'error', text: 'Failed to read file' });
        setTimeout(() => setImportMessage(null), 5000);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Compute comparison highlights
  const getComparisonHighlights = () => {
    if (selectedFavorites.length < 2) return {};

    const prices = selectedFavorites.map(f => f.snapshot.price).filter(p => p > 0);
    const sqfts = selectedFavorites.map(f => f.snapshot.sqft).filter(s => s > 0);
    const pricePerSqft = selectedFavorites.map(f => {
      if (f.snapshot.price > 0 && f.snapshot.sqft > 0) {
        return { id: f.id, value: f.snapshot.price / f.snapshot.sqft };
      }
      return null;
    }).filter((p): p is { id: string; value: number } => p !== null);

    const highlights: Record<string, string[]> = {};
    
    // Lowest price
    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      selectedFavorites.forEach(f => {
        if (f.snapshot.price === minPrice) {
          highlights[f.id] = [...(highlights[f.id] || []), 'lowest-price'];
        }
      });
    }

    // Highest sqft
    if (sqfts.length > 0) {
      const maxSqft = Math.max(...sqfts);
      selectedFavorites.forEach(f => {
        if (f.snapshot.sqft === maxSqft) {
          highlights[f.id] = [...(highlights[f.id] || []), 'highest-sqft'];
        }
      });
    }

    // Best $/sqft (lowest)
    if (pricePerSqft.length > 0) {
      const bestValue = pricePerSqft.reduce((best, current) => 
        current.value < best.value ? current : best
      );
      highlights[bestValue.id] = [...(highlights[bestValue.id] || []), 'best-value'];
    }

    return highlights;
  };

  const comparisonHighlights = getComparisonHighlights();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
              <p className="mt-2 text-gray-600">
                {favorites.length} {favorites.length === 1 ? 'property' : 'properties'} saved
              </p>
            </div>
            <div className="flex items-center gap-4">
              {favorites.length > 0 && (
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export
                </button>
              )}
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map
              </Link>
              <Link
                href="/houses"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Listings
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Import Message */}
      {importMessage && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm animate-slide-in ${
          importMessage.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {importMessage.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${
                importMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {importMessage.text}
              </p>
            </div>
            <button
              onClick={() => setImportMessage(null)}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-500"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Compare Limit Message */}
      {compareLimitMessage && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm bg-amber-50 border border-amber-200 animate-slide-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-amber-800">
                You can compare up to 3 properties at once
              </p>
            </div>
            <button
              onClick={() => setCompareLimitMessage(false)}
              className="ml-4 flex-shrink-0 text-amber-400 hover:text-amber-500"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Compare Mode Toggle and Search/Sort */}
        {favorites.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => {
                    setCompareMode(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedForCompare(new Set());
                    }
                  }}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-700">Compare Mode</span>
              </label>
              {compareMode && selectedForCompare.size > 0 && (
                <span className="text-sm text-gray-600">
                  {selectedForCompare.size} of 3 selected
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by address, city, zip, notes, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-6 py-4 pr-12 text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-4 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors font-medium text-gray-700 appearance-none pr-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Saved: Newest</option>
                  <option value="oldest">Saved: Oldest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compare Panel */}
        {compareMode && selectedFavorites.length >= 2 && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Compare Properties</h2>
              <button
                onClick={() => setSelectedForCompare(new Set())}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Selection
              </button>
            </div>
            <div className={`grid gap-4 ${selectedFavorites.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {selectedFavorites.map((favorite) => {
                const highlights = comparisonHighlights[favorite.id] || [];
                return (
                  <div
                    key={favorite.id}
                    className={`border-2 rounded-lg p-4 ${
                      highlights.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{favorite.snapshot.address}</h3>
                        <p className="text-sm text-gray-600">
                          {favorite.snapshot.city}, {favorite.snapshot.state}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCompareToggle(favorite.id)}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className={`flex justify-between ${highlights.includes('lowest-price') ? 'font-bold text-green-600' : ''}`}>
                        <span className="text-gray-600">Price:</span>
                        <span>{formatPrice(favorite.snapshot.price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Beds:</span>
                        <span>{favorite.snapshot.beds}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Baths:</span>
                        <span>{favorite.snapshot.baths}</span>
                      </div>
                      <div className={`flex justify-between ${highlights.includes('highest-sqft') ? 'font-bold text-blue-600' : ''}`}>
                        <span className="text-gray-600">Sqft:</span>
                        <span>{favorite.snapshot.sqft.toLocaleString()}</span>
                      </div>
                      {favorite.snapshot.price > 0 && favorite.snapshot.sqft > 0 && (
                        <div className={`flex justify-between ${highlights.includes('best-value') ? 'font-bold text-purple-600' : ''}`}>
                          <span className="text-gray-600">$/sqft:</span>
                          <span>${(favorite.snapshot.price / favorite.snapshot.sqft).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    {highlights.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {highlights.includes('lowest-price') && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Lowest Price</span>
                        )}
                        {highlights.includes('highest-sqft') && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Largest</span>
                        )}
                        {highlights.includes('best-value') && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Best Value</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results */}
        {filteredAndSorted.length === 0 && favorites.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h3 className="mt-4 text-2xl font-bold text-gray-900">No favorites yet</h3>
            <p className="mt-2 text-gray-600 mb-6">
              Start saving properties you love by clicking the heart icon on any listing.
            </p>
            <Link
              href="/houses"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Browse Properties
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No favorites match your search</h3>
            <p className="mt-2 text-gray-600">
              Try adjusting your search terms.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAndSorted.map((favorite) => (
              <div
                key={favorite.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 ${
                  compareMode && selectedForCompare.has(favorite.id) ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="relative h-64 w-full">
                  <Image
                    src={favorite.snapshot.photo}
                    alt={favorite.snapshot.address}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {compareMode && (
                    <div className="absolute top-4 left-4">
                      <label className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg cursor-pointer hover:bg-white transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedForCompare.has(favorite.id)}
                          onChange={() => handleCompareToggle(favorite.id)}
                          disabled={!selectedForCompare.has(favorite.id) && selectedForCompare.size >= 3}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Compare</span>
                      </label>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{favorite.snapshot.address}</h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {favorite.snapshot.city}, {favorite.snapshot.state} {favorite.snapshot.zip}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleRemove(e, favorite.id, favorite.snapshot.address)}
                      className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove from favorites"
                      aria-label="Remove from favorites"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-blue-600">{formatPrice(favorite.snapshot.price)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-gray-700 text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span>{favorite.snapshot.beds} beds</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <span>{favorite.snapshot.baths} baths</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <span>{favorite.snapshot.sqft.toLocaleString()} sqft</span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    {editingNote?.id === favorite.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingNote.note}
                          onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
                          onBlur={() => {
                            if (editingNote) {
                              handleNoteChange(editingNote.id, editingNote.note);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              if (editingNote) {
                                handleNoteChange(editingNote.id, editingNote.note);
                              }
                            }
                            if (e.key === 'Escape') {
                              setEditingNote(null);
                            }
                          }}
                          maxLength={300}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Ctrl+Enter to save, Esc to cancel</span>
                          <span>{editingNote.note.length}/300</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingNote({ id: favorite.id, note: favorite.note || '' })}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg cursor-text hover:border-blue-500 transition-colors min-h-[60px] flex items-center"
                      >
                        {favorite.note ? (
                          <p className="text-gray-700 whitespace-pre-wrap">{favorite.note}</p>
                        ) : (
                          <p className="text-gray-400 italic">Click to add a note...</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {favorite.tags && favorite.tags.length > 0 ? (
                        favorite.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeTag(favorite.id, tag);
                              }}
                              className="hover:text-red-600"
                              aria-label={`Remove tag ${tag}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic">No tags yet</p>
                      )}
                    </div>
                    {(!favorite.tags || favorite.tags.length < 10) && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTagInputs[favorite.id] || ''}
                          onChange={(e) => setNewTagInputs(prev => ({ ...prev, [favorite.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleTagAdd(favorite.id);
                            }
                          }}
                          placeholder="Add tag..."
                          className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => handleTagAdd(favorite.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    )}
                    {favorite.tags && favorite.tags.length >= 10 && (
                      <p className="text-xs text-gray-500">Maximum 10 tags reached</p>
                    )}
                  </div>

                  {/* View Details Link */}
                  <Link
                    href={`/properties?id=${favorite.id}`}
                    className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    onClick={(e) => {
                      // Prevent navigation if clicking on interactive elements
                      if ((e.target as HTMLElement).closest('button, input, textarea')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Remove from Favorites?"
        message={
          deleteConfirm.propertyAddress
            ? `Are you sure you want to remove "${deleteConfirm.propertyAddress}" from your favorites? This action cannot be undone.`
            : 'Are you sure you want to remove this property from your favorites? This action cannot be undone.'
        }
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
        variant="danger"
      />
    </div>
  );
}
