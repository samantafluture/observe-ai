import { useQueryState, parseAsStringEnum } from 'nuqs';

export type DataSource = 'geojson' | 'parquet';

// ?source=parquet opts into the DuckDB-WASM path. Default is `geojson` —
// zero extra bytes, zero bootstrap cost. Flag is URL-synced so reload keeps
// whichever mode the user chose.
export function useDataSource(): DataSource {
  const [src] = useQueryState(
    'source',
    parseAsStringEnum<DataSource>(['geojson', 'parquet']).withDefault('geojson'),
  );
  return src;
}
