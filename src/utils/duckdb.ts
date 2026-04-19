// Lazy DuckDB-WASM bootstrap for the Phase 3 Parquet path.
//
// This module is ONLY imported when the `?source=parquet` URL flag is set so
// the ~4 MB wasm bundle never hits users on the default GeoJSON path. The
// module returns a singleton database with a per-call query helper.

import * as duckdb from '@duckdb/duckdb-wasm';

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

async function bootstrap(): Promise<duckdb.AsyncDuckDB> {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  const workerBlob = new Blob([`importScripts("${bundle.mainWorker}");`], {
    type: 'text/javascript',
  });
  const worker = new Worker(URL.createObjectURL(workerBlob));
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  return db;
}

export function getDb(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) dbPromise = bootstrap();
  return dbPromise;
}

export async function queryRows<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const db = await getDb();
  const conn = await db.connect();
  try {
    const result = await conn.query(sql);
    return result.toArray().map((row) => row.toJSON() as T);
  } finally {
    await conn.close();
  }
}

/**
 * Register a remote Parquet file under a SQL-queryable name. Subsequent
 * queries can read from `SELECT * FROM <name>`.
 */
export async function registerParquet(name: string, url: string): Promise<void> {
  const db = await getDb();
  // DuckDB-WASM supports HTTP range requests on `httpfs`, but the simplest
  // approach here is to buffer the file once (our Parquet files are small,
  // <100 KB each) and register it as a local buffer.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`parquet ${url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  await db.registerFileBuffer(`${name}.parquet`, buf);
}
