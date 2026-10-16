import { readFile } from 'node:fs/promises';

const configSource = await readFile(new URL('../../supabase-config.js', import.meta.url), 'utf8');
const projectUrl = configSource.match(/\burl:\s*['"]([^'"]+)['"]/)?.[1];
const publishableKey = configSource.match(/\bpublishableKey:\s*['"]([^'"]+)['"]/)?.[1];

if (!projectUrl || !publishableKey) {
  throw new Error('Could not read the Supabase URL and publishable key from supabase-config.js.');
}

const url = new URL('/rest/v1/saraai_live_messages', projectUrl);
url.searchParams.set('select', 'id');
url.searchParams.set('limit', '1');

const response = await fetch(url, {
  headers: {
    apikey: publishableKey
  },
  signal: AbortSignal.timeout(15_000)
});

if (!response.ok) {
  const details = await response.text();
  throw new Error(`Supabase keepalive request failed (${response.status}): ${details}`);
}

console.log(`Supabase keepalive query succeeded (${response.status}).`);
