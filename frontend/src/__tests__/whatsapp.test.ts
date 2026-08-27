import { describe, it, expect } from 'vitest';
import { getWhatsAppShareUrl } from '../utils/whatsapp';
import { Listing } from '../services/api';

describe('WhatsApp Share Utility', () => {
  it('generates a valid WhatsApp URL with business name and phone', () => {
    const listing: Listing = {
      id: 'test-123',
      name: 'City Hospital',
      address: 'Station Road',
      phone: '+919876543210',
      category_id: 1,
      verified: true,
      status: 'approved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const url = getWhatsAppShareUrl(listing);
    expect(url).toContain('api.whatsapp.com/send?text=');
    expect(url).toContain('City%20Hospital');
    expect(url).toContain('%2B919876543210');
  });
});
