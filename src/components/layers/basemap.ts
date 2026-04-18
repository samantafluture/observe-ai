import { GeoJsonLayer } from '@deck.gl/layers';
import type { FeatureCollection } from 'geojson';
import { PHOSPHOR } from '../../utils/colors';

export function buildBasemapLayers(
  land: FeatureCollection | null,
  countries: FeatureCollection | null,
) {
  const layers = [];

  if (land) {
    layers.push(
      new GeoJsonLayer({
        id: 'basemap-land',
        data: land,
        stroked: true,
        filled: true,
        getFillColor: [...PHOSPHOR.land, 230],
        getLineColor: [...PHOSPHOR.landStroke, 200],
        lineWidthMinPixels: 0.5,
        lineWidthMaxPixels: 1.2,
        pickable: false,
      }),
    );
  }

  if (countries) {
    layers.push(
      new GeoJsonLayer({
        id: 'basemap-countries',
        data: countries,
        stroked: true,
        filled: false,
        getLineColor: [...PHOSPHOR.border, 150],
        lineWidthMinPixels: 0.4,
        lineWidthMaxPixels: 0.9,
        pickable: false,
      }),
    );
  }

  return layers;
}
