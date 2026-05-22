# Looops Storefinder

Embeddable Mapbox-Storefinder für Shopify, gespeist aus HubSpot. Daten werden täglich via GitHub Action aktualisiert und als statische `stores.json` über jsDelivr ausgeliefert.

## Architektur

```
┌─────────────┐      daily cron      ┌──────────────┐   git commit   ┌──────────────────┐
│   HubSpot   │ ───────────────────▶ │ GitHub Action│ ─────────────▶ │  stores.json     │
│  (Liste +   │   scripts/sync.mjs   │              │                │  (im Repo)       │
│   Companies)│                      └──────────────┘                └────────┬─────────┘
└─────────────┘                                                                │
                                                                               │ jsDelivr CDN
                                                                               ▼
                                                                    ┌──────────────────┐
                                                                    │ Shopify Section  │
                                                                    │ + storefinder.js │
                                                                    │ (Mapbox + Filter)│
                                                                    └──────────────────┘
```

## Setup

### 1. HubSpot vorbereiten

- **Aktive Liste** anlegen (z.B. "Storefinder Webseite") mit Kriterium:
  - `LSF · Eintrag Storefinder = Ja`
  - **UND** assoziierte Deal: `dealname` beginnt mit `#2` ODER `2` **UND** `closedate` in den letzten 6 Monaten **UND** `dealstage = processed`
- **Private App** unter Settings → Integrations → Private Apps, Scopes:
  - `crm.lists.read`
  - `crm.objects.companies.read`
  - `crm.objects.deals.read`
  - (`crm.schemas.companies.read` — optional, nur für Debug)

### 2. Mapbox

- Public Token (`pk.*`) aus mapbox.com kopieren
- Empfehlung: **URL-Restriction** auf eure Shopify-Domain setzen

### 3. GitHub Repo

- Dieses Repo öffentlich pushen
- Unter **Settings → Secrets and variables → Actions** anlegen:
  - `HUBSPOT_TOKEN` — der Private-App-Token
  - `HUBSPOT_LIST_ID` — die ID der Liste (aus der URL `/lists/<id>/membership`)
  - `MAPBOX_TOKEN` — Mapbox Token (wird sowohl fürs Geocoding als auch im Frontend benötigt)
- Action manuell triggern: **Actions → Sync Storefinder → Run workflow**

### 4. Shopify Section installieren

1. Online Store → Themes → Edit code
2. Sections → "Add a new section" → Name: `storefinder` → Liquid
3. Inhalt von [`shopify/storefinder.liquid`](shopify/storefinder.liquid) einfügen, speichern
4. Im Theme Editor auf der Ziel-Seite **"Section hinzufügen" → "Storefinder"**
5. In den Section-Settings eintragen:
   - **stores.json URL**: `https://cdn.jsdelivr.net/gh/<USER>/looops-storefinder@main/stores.json`
   - **GitHub Repo**: `<USER>/looops-storefinder`
   - **Mapbox Token**: euer `pk.*` Token

### 5. Bundle bauen

Bei Änderungen am Frontend-Code:

```bash
pnpm install   # oder npm install
pnpm build     # erzeugt dist/storefinder.{js,css}
git add dist/ && git commit -m "build: …" && git push
```

`shopify/storefinder.liquid` lädt `dist/*` direkt via jsDelivr — d.h. nach jedem Push ist die Änderung in Shopify innerhalb von Minuten live. Für stabile Auslieferung: einen Git-Tag (z.B. `v1.0.0`) setzen und im Section-Setting `Bundle-Version` eintragen.

## Lokale Entwicklung

```bash
pnpm install
pnpm dev   # watch + Dev-Server auf http://localhost:8080/src/index.html
```

Verwendet `sample-stores.json` mit 6 Beispiel-Stores — kein HubSpot-Token nötig.

## Sync manuell ausführen

```bash
HUBSPOT_TOKEN=… HUBSPOT_LIST_ID=… MAPBOX_TOKEN=… node scripts/sync.mjs
```

Schreibt `stores.json` + `geocode-cache.json` ins Repo-Root.

## Felder-Mapping

| Storefinder-Output      | HubSpot Property (Primär)        | Fallback                        |
|-------------------------|----------------------------------|---------------------------------|
| `name`                  | `lsp___name`                     | `name`                          |
| `address.street`        | `lsp___stra_e`                   | `address`                       |
| `address.city`          | `lsp___stadt`                    | `city`                          |
| `address.zip`           | `lsp___postlzeitzahl`            | `zip`                           |
| `address.country`       | `lsf___land`                     | `country`                       |
| `branche`               | `branche` (LPS · Branche Looops) | —                               |
| `premium_partner`       | `lsf__eintrag_premium_partner`   | —                               |
| `looops_store`          | `lps__looops_store`              | —                               |
| `tags[]`                | `lsf__duftkerzen`, `lsf__duftspray`, `lsf__duftstabchen`, `lsf__aroma_diffuser`, `lsf__atherische_ole` | — |
| `website`               | `lsf___website`                  | `website`                       |
| `phone`                 | `phone`                          | —                               |
| `lat`/`lng`             | Geocoded via Mapbox aus Adresse  | —                               |
