#!/usr/bin/env node
/**
 * Looops Storefinder Sync
 * ------------------------
 * Holt alle Companies aus einer HubSpot-Liste, geocodet die Adressen
 * und schreibt eine stores.json + geocode-cache.json ins Repo-Root.
 *
 * Env:
 *   HUBSPOT_TOKEN     Private App Token (Scopes: crm.lists.read, crm.objects.companies.read)
 *   HUBSPOT_LIST_ID   ID der aktiven HubSpot-Liste "Storefinder Webseite"
 *   MAPBOX_TOKEN      Mapbox Token (für Geocoding API)
 */

import { writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ─── Config ────────────────────────────────────────────────────────────────
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const HUBSPOT_LIST_ID = process.env.HUBSPOT_LIST_ID;
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

const COMPANY_PROPERTIES = [
  // Standard HubSpot fields (Fallback für Adresse + Kontakt)
  "name",
  "address",
  "city",
  "zip",
  "country",
  "phone",
  "website",
  // LSF/LSP Storefinder-Felder (Primärquelle)
  "lsp___name",
  "lsp___stra_e",
  "lsp___stadt",
  "lsp___postlzeitzahl",
  "lsf___land",
  "lsf___website",
  // Produkt-Tags (boolean)
  "lsf__duftkerzen",
  "lsf__duftspray",
  "lsf__duftstabchen",
  "lsf__aroma_diffuser",
  "lsf__atherische_ole",
  // Kategorien
  "lsf__eintrag_premium_partner",
  "lps__looops_store",
  "branche",
];

const TAG_FIELDS = {
  Duftkerzen: "lsf__duftkerzen",
  Duftspray: "lsf__duftspray",
  Duftstäbchen: "lsf__duftstabchen",
  "Aroma Diffuser": "lsf__aroma_diffuser",
  "Ätherische Öle": "lsf__atherische_ole",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const assert = (v, msg) => {
  if (!v) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
};
const isTrue = (v) => v === "true" || v === true || v === "Ja";
const firstNonEmpty = (...vals) =>
  vals.find((v) => v != null && String(v).trim() !== "") ?? "";

async function hubspot(pathname, options = {}) {
  const url = `https://api.hubapi.com${pathname}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HubSpot ${res.status} ${pathname}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

// ─── HubSpot: Liste → Company-IDs ──────────────────────────────────────────
async function fetchListMembershipIds(listId) {
  const ids = [];
  let after;
  do {
    const params = new URLSearchParams({ limit: "250" });
    if (after) params.set("after", after);
    const json = await hubspot(
      `/crm/v3/lists/${listId}/memberships?${params}`,
    );
    for (const r of json.results || []) ids.push(String(r.recordId));
    after = json.paging?.next?.after;
  } while (after);
  return ids;
}

// ─── HubSpot: Company-Batch-Read ───────────────────────────────────────────
async function fetchCompanies(ids) {
  const all = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const json = await hubspot(`/crm/v3/objects/companies/batch/read`, {
      method: "POST",
      body: JSON.stringify({
        properties: COMPANY_PROPERTIES,
        inputs: chunk.map((id) => ({ id })),
      }),
    });
    all.push(...(json.results || []));
  }
  return all;
}

// ─── Mapbox: Geocoding mit Cache ───────────────────────────────────────────
async function loadCache() {
  const p = path.join(ROOT, "geocode-cache.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(await readFile(p, "utf8"));
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await writeFile(
    path.join(ROOT, "geocode-cache.json"),
    JSON.stringify(cache, null, 2) + "\n",
  );
}

async function geocode(query, cache) {
  if (!query) return null;
  if (cache[query]) return cache[query];
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${MAPBOX_TOKEN}&limit=1&types=address,postcode,place&language=de`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ⚠ Mapbox ${res.status} für "${query}"`);
    return null;
  }
  const json = await res.json();
  const feat = json.features?.[0];
  if (!feat) {
    console.warn(`  ⚠ Kein Geocoding-Treffer für "${query}"`);
    cache[query] = null;
    return null;
  }
  const [lng, lat] = feat.center;
  const result = { lat, lng, place_name: feat.place_name };
  cache[query] = result;
  return result;
}

// ─── Company → Store-Record ────────────────────────────────────────────────
function buildStore(company) {
  const p = company.properties || {};
  const name = firstNonEmpty(p.lsp___name, p.name);
  const street = firstNonEmpty(p.lsp___stra_e, p.address);
  const city = firstNonEmpty(p.lsp___stadt, p.city);
  const zip = firstNonEmpty(p.lsp___postlzeitzahl, p.zip);
  const country = firstNonEmpty(p.lsf___land, p.country);

  const tags = Object.entries(TAG_FIELDS)
    .filter(([, field]) => isTrue(p[field]))
    .map(([label]) => label);

  return {
    id: company.id,
    name,
    address: { street, city, zip, country },
    branche: p.branche || null,
    premium_partner: isTrue(p.lsf__eintrag_premium_partner),
    looops_store: isTrue(p.lps__looops_store),
    tags,
    phone: p.phone || null,
    website: firstNonEmpty(p.lsf___website, p.website) || null,
  };
}

function addressQuery(s) {
  const parts = [s.address.street, s.address.zip, s.address.city, s.address.country].filter(Boolean);
  return parts.join(", ");
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  assert(HUBSPOT_TOKEN, "HUBSPOT_TOKEN env-Variable fehlt");
  assert(HUBSPOT_LIST_ID, "HUBSPOT_LIST_ID env-Variable fehlt");
  assert(MAPBOX_TOKEN, "MAPBOX_TOKEN env-Variable fehlt");

  console.log(`→ HubSpot Liste ${HUBSPOT_LIST_ID} laden …`);
  const ids = await fetchListMembershipIds(HUBSPOT_LIST_ID);
  console.log(`  ${ids.length} Companies in Liste`);

  if (ids.length === 0) {
    console.warn("  ⚠ Liste ist leer. stores.json wird mit [] geschrieben.");
  }

  console.log(`→ Company-Details laden …`);
  const companies = await fetchCompanies(ids);
  console.log(`  ${companies.length} Companies geladen`);

  console.log(`→ Geocoding-Cache laden …`);
  const cache = await loadCache();
  const cacheBefore = Object.keys(cache).length;

  console.log(`→ Stores aufbereiten + geocoden …`);
  const stores = [];
  let skipped = 0;
  let geocoded = 0;

  for (const c of companies) {
    const s = buildStore(c);
    const query = addressQuery(s);
    if (!query || !s.name) {
      skipped++;
      continue;
    }
    const loc = await geocode(query, cache);
    if (!loc) {
      skipped++;
      continue;
    }
    if (!cache[query] || cache[query] === loc) geocoded++;
    s.lat = loc.lat;
    s.lng = loc.lng;
    stores.push(s);
  }

  await saveCache(cache);
  console.log(
    `  ${stores.length} Stores aufbereitet, ${skipped} übersprungen (keine Adresse / kein Geocoding)`,
  );
  console.log(`  Cache: ${cacheBefore} → ${Object.keys(cache).length}`);

  const output = {
    generated_at: new Date().toISOString(),
    count: stores.length,
    stores,
  };
  await writeFile(
    path.join(ROOT, "stores.json"),
    JSON.stringify(output, null, 2) + "\n",
  );
  console.log(`✓ stores.json geschrieben (${stores.length} Einträge)`);
}

main().catch((err) => {
  console.error("✗ Sync fehlgeschlagen:", err);
  process.exit(1);
});
