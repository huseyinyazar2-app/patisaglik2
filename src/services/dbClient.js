import { createClient } from '@libsql/client/web';

let client = null;

export function getDbClient() {
  const url = import.meta.env?.VITE_TURSO_DATABASE_URL;
  const authToken = import.meta.env?.VITE_TURSO_AUTH_TOKEN;

  if (!url || !authToken) return null;
  if (!client) {
    client = createClient({ url, authToken });
  }
  return client;
}

export function isDbConfigured() {
  return Boolean(import.meta.env?.VITE_TURSO_DATABASE_URL && import.meta.env?.VITE_TURSO_AUTH_TOKEN);
}
