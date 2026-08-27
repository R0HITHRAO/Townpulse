import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Map } from '../components/Map';
import { ListingCard } from '../components/ListingCard';
import { CategoryChips } from '../components/CategoryChips';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api, Category, Listing } from '../services/api';
import { Search, SlidersHorizontal, Map as MapIcon, List, X } from 'lucide-react';

export const MapView: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [radius, setRadius] = useState(15000);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .searchListings({
        q: searchQuery || undefined,
        category_id: selectedCategory || undefined,
        radius: radius,
        per_page: 50,
      })
      .then((res) => setListings(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchQuery, selectedCategory, radius]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-white">
      {/* Top Filter Bar */}
      <div className="p-3 sm:px-6 bg-white border-b border-gray-200 z-20 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search on map..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-xl overflow-hidden">
          <CategoryChips
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        {/* Radius Selector & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200/80 px-2.5 py-1 rounded-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
            <span>Radius:</span>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value={5000}>5 km</option>
              <option value={10000}>10 km</option>
              <option value={15000}>15 km</option>
              <option value={25000}>25 km</option>
              <option value={50000}>50 km</option>
            </select>
          </div>

          {/* Mobile view switch toggle (Map vs List) */}
          <div className="flex md:hidden bg-gray-100 p-0.5 rounded-xl border border-gray-200">
            <button
              onClick={() => setMobileTab('map')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                mobileTab === 'map' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
            <button
              onClick={() => setMobileTab('list')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                mobileTab === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List ({listings.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Map + List Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left: Scrollable List Sidebar */}
        <div
          className={`w-full md:w-96 lg:w-[440px] bg-slate-50 border-r border-gray-200 overflow-y-auto p-4 space-y-3 z-10 ${
            mobileTab === 'list' ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            <span>Nearby Results</span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
              {listings.length} Found
            </span>
          </div>

          {loading ? (
            <LoadingSpinner message="Updating map markers..." />
          ) : listings.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-xs text-gray-500">
              No services found within this radius.
            </div>
          ) : (
            listings.map((l) => (
              <div
                key={l.id}
                onClick={() => {
                  setSelectedListing(l);
                  setMobileTab('map');
                }}
                className={`cursor-pointer transition-all ${
                  selectedListing?.id === l.id ? 'ring-2 ring-blue-500 rounded-2xl' : ''
                }`}
              >
                <ListingCard listing={l} />
              </div>
            ))
          )}
        </div>

        {/* Right: Full Interactive Map */}
        <div className={`flex-1 h-full min-h-[300px] relative ${mobileTab === 'map' ? 'block' : 'hidden md:block'}`}>
          <Map
            listings={listings}
            selectedListingId={selectedListing?.id}
            onSelectListing={(l) => setSelectedListing(l)}
            className="h-full w-full rounded-none border-none"
          />
        </div>
      </div>
    </div>
  );
};
