import { Listing } from '../services/api';

/**
 * Generates a pre-formatted WhatsApp share URL for a listing.
 */
export function getWhatsAppShareUrl(listing: Listing): string {
  const lines = [
    `📍 *${listing.name}*`,
    listing.category ? `🏷️ Category: ${listing.category.icon || ''} ${listing.category.name}` : '',
    listing.address ? `🏠 Address: ${listing.address}` : '',
    listing.phone ? `📞 Phone: ${listing.phone}` : '',
    listing.website ? `🌐 Website: ${listing.website}` : '',
    '',
    `🗺️ *Google Maps Directions:*`,
    listing.lat && listing.lng
      ? `https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(listing.address)}`,
    '',
    `🔎 *View on TownPulse:* ${window.location.origin}/listings/${listing.id}`,
  ].filter((line) => line !== '');

  const message = lines.join('\n');
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}
