/**
 * Typed shortcut for the location-aware parts of the tree.
 *
 * The user never sees this file; pages and components use
 * `useCurrentLocation()` to ask "where are we?" and change "where are we?".
 */

import { useCurrentLocation as useCurrentLocationRaw } from '../context/LocationContext';

export function useCurrentLocation(): ReturnType<
  typeof import('../context/LocationContext').useCurrentLocation
> {
  return useCurrentLocationRaw();
}
