import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Map } from '../components/Map';
import { Listing } from '../services/api';

const makeListing = (id: string, lat: number, lng: number): Listing => ({
  id,
  name: `Place ${id}`,
  address: 'Central Avenue',
  lat,
  lng,
  verified: false,
  status: 'approved',
});

describe('Map', () => {
  it('renders valid places in a marker cluster and skips invalid coordinates', () => {
    render(
      <BrowserRouter>
        <Map
          listings={[
            makeListing('valid', 20, 0),
            makeListing('outside-latitude', 95, 0),
            makeListing('not-a-number', Number.NaN, 0),
          ]}
        />
      </BrowserRouter>
    );

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('marker-cluster-group')).toBeInTheDocument();
    expect(screen.getAllByTestId('marker')).toHaveLength(1);
  });
});
