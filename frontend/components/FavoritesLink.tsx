'use client';

import Link from 'next/link';
import { useFavorites } from '@/app/lib/useFavorites';

export default function FavoritesLink() {
  const { count, isReady } = useFavorites();

  if (!isReady) {
    return null;
  }

  const favoriteCount = count();

  return (
    <Link
      href="/favorites"
      className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span>Favorites</span>
      {favoriteCount > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {favoriteCount}
        </span>
      )}
    </Link>
  );
}

