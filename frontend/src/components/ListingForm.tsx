import React, { useState, useEffect } from 'react';
import { Category, Listing, api } from '../services/api';
import { MapPin, Phone, Building, Check, Crosshair, Image as ImageIcon } from 'lucide-react';
import { town } from '../config/site';
import { loadSnapshotCategories } from '../services/directoryFallback';

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
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false);
  const [name, setName] = useState(initialData.name || '');
  // `category_id` is `number | string | null` on Listing: a numeric id from the
  // API, or a slug from the static offline snapshot. Narrow to a number here
  // because the submit endpoint is the API and only accepts numeric ids.
  const [categoryId, setCategoryId] = useState<number | ''>(initialData.category_id ?? '');
  const [description, setDescription] = useState(initialData.description || '');
  const [address, setAddress] = useState(initialData.address || '');
  const [imageUrl, setImageUrl] = useState(initialData.image_url || '');
  const [lat, setLat] = useState<string>(initialData.lat?.toString() || String(town.lat));
  const [lng, setLng] = useState<string>(initialData.lng?.toString() || String(town.lng));
  const [phone, setPhone] = useState(initialData.phone || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [website, setWebsite] = useState(initialData.website || '');
  const [hours, setHours] = useState(initialData.hours?.all_days || '9:00 AM - 6:00 PM');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    api
      .getCategories()
      .then((items) => {
        setCategories(items);
        setCategoriesUnavailable(false);
      })
      .catch(async () => {
        const snapshotCategories = await loadSnapshotCategories();
        setCategories(snapshotCategories);
        setCategoriesUnavailable(snapshotCategories.length === 0);
      });
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
        alert('Could not auto-locate this address. You can type coordinates or use GPS below.');
      }
    } catch (e) {
      console.warn('Geocode error:', e);
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGettingLocation(false);
      },
      (err) => {
        alert(`Location access denied or unavailable: ${err.message}`);
        setGettingLocation(false);
      },
      { timeout: 10000 }
    );
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
      image_url: imageUrl.trim() || undefined,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      hours: hours ? { all_days: hours } : undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="tp-card mx-auto w-full max-w-2xl space-y-6 rounded-3xl p-6 sm:p-8"
    >
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[var(--tp-border)] pb-2 text-base font-semibold text-[var(--tp-text)]">
          <Building aria-hidden="true" className="h-4 w-4 text-[var(--tp-primary)]" />
          General Service Information
        </h3>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
            Service or Business Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Town Primary Health Center"
            className="tp-input text-base"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
            Category
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            className="tp-input text-base"
          >
            <option value="">Select a Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          {categoriesUnavailable && (
            <p role="status" className="mt-2 text-xs text-[var(--tp-warn-soft-text)]">
              No categories are loaded. You can submit without one once the server is available.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
            Storefront Photo URL (Optional)
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <ImageIcon
                aria-hidden="true"
                className="absolute left-3 top-3 h-4 w-4 text-[var(--tp-text-subtle)]"
              />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg or Unsplash link"
                className="tp-input pl-9 text-base"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the services offered, specialties, or assistance provided..."
            className="tp-input text-base"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[var(--tp-border)] pb-2 text-base font-semibold text-[var(--tp-text)]">
          <MapPin aria-hidden="true" className="h-4 w-4 text-[var(--tp-primary)]" />
          Location & GPS Coordinates
        </h3>

        <div>
          <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
            Full Physical Address *
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Opposite Town Bus Stand, Main Road"
              className="tp-input min-w-0 flex-1 text-base"
            />
            <button
              type="button"
              onClick={handleGeocodeAddress}
              disabled={searchingAddress}
              className="tp-btn tp-btn-secondary min-h-11 shrink-0 rounded-xl px-3 text-xs"
            >
              {searchingAddress ? 'Locating...' : 'Search Pin'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--tp-text-subtle)]">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="tp-input min-h-11 py-1.5 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--tp-text-subtle)]">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="tp-input min-h-11 py-1.5 text-base"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={gettingLocation}
          className="tp-btn tp-btn-secondary min-h-11 rounded-xl px-3 text-xs"
        >
          <Crosshair aria-hidden="true" className="h-3.5 w-3.5" />
          <span>{gettingLocation ? 'Detecting GPS...' : 'Use My Current GPS Position'}</span>
        </button>
      </div>

      {/* Contact Details */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 border-b border-[var(--tp-border)] pb-2 text-base font-semibold text-[var(--tp-text)]">
          <Phone aria-hidden="true" className="h-4 w-4 text-[var(--tp-primary)]" />
          Contact & Timings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9845012345"
              className="tp-input text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@service.com"
              className="tp-input text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
              Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://myservice.com"
              className="tp-input text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[var(--tp-text-muted)]">
              Operating Hours
            </label>
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="e.g. 8:00 AM - 8:00 PM"
              className="tp-input text-base"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="tp-btn tp-btn-primary min-h-12 w-full rounded-2xl text-sm"
      >
        <Check aria-hidden="true" className="h-4 w-4" />
        {isSubmitting ? 'Submitting...' : submitLabel}
      </button>
    </form>
  );
};
