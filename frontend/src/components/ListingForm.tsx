import React, { useState, useEffect } from 'react';
import { Category, Listing, api } from '../services/api';
import { MapPin, Phone, Mail, Globe, Clock, Building, Tag, Check } from 'lucide-react';

interface ListingFormProps {
  initialData?: Partial<Listing>;
  onSubmit: (data: Partial<Listing>) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export const ListingForm: React.FC<ListingFormProps> = ({
  initialData = {},
  onSubmit,
  submitLabel = 'Submit Listing',
  isSubmitting = false,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(initialData.name || '');
  const [categoryId, setCategoryId] = useState<number | ''>(initialData.category_id || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [address, setAddress] = useState(initialData.address || '');
  const [lat, setLat] = useState<string>(initialData.lat?.toString() || '12.9716');
  const [lng, setLng] = useState<string>(initialData.lng?.toString() || '77.5946');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [website, setWebsite] = useState(initialData.website || '');
  const [hours, setHours] = useState(initialData.hours?.all_days || '9:00 AM - 6:00 PM');
  const [searchingAddress, setSearchingAddress] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  // Free OpenStreetMap Nominatim address geocoding
  const handleGeocodeAddress = async () => {
    if (!address.trim()) return;
    setSearchingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(Number(data[0].lat).toFixed(6));
        setLng(Number(data[0].lon).toFixed(6));
      } else {
        alert('Could not find coordinates for this address. You can set them manually.');
      }
    } catch (e) {
      console.warn('Geocode error:', e);
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      alert('Please provide at least the business name and address.');
      return;
    }

    await onSubmit({
      name,
      category_id: categoryId ? Number(categoryId) : undefined,
      description,
      address,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      hours: hours ? { all_days: hours } : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm max-w-2xl mx-auto">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
          <Building className="w-4 h-4 text-blue-600" />
          General Service Information
        </h3>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Service or Business Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Town Primary Health Center"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the services offered, specialties, or assistance provided..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Location Details
        </h3>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Full Address *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Opposite Town Bus Stand, Main Road"
              className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleGeocodeAddress}
              disabled={searchingAddress}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 text-xs font-semibold rounded-xl transition"
            >
              {searchingAddress ? 'Locating...' : 'Get Pin'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-2">
          <Phone className="w-4 h-4 text-blue-600" />
          Contact & Timings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9845012345"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@service.com"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://myservice.com"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Operating Hours
            </label>
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 8:00 AM - 8:00 PM"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition shadow-md flex items-center justify-center gap-2"
      >
        <Check className="w-4 h-4" />
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  );
};
