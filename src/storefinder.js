/**
 * Looops Storefinder — Vanilla-JS-Bundle
 *
 * Usage:
 *   <div id="storefinder"></div>
 *   <script src="https://cdn.jsdelivr.net/.../storefinder.js"></script>
 *   <script>
 *     LooopsStorefinder.init(document.getElementById('storefinder'), {
 *       dataUrl: 'https://cdn.jsdelivr.net/.../stores.json',
 *       mapboxToken: 'pk.eyJ1...',
 *       defaultCenter: [13.5, 47.6],
 *       defaultZoom: 5.8,
 *     });
 *   </script>
 */

const TAG_LABELS = [
  "Duftkerzen",
  "Duftspray",
  "Duftstäbchen",
  "Aroma Diffuser",
  "Ätherische Öle",
];

const MAPBOX_CSS = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css";
const MAPBOX_JS = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js";

// ─── Asset Loading ─────────────────────────────────────────────────────────
function loadCss(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) return resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.mapboxgl) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── HTML helpers ──────────────────────────────────────────────────────────
const h = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
};

const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

// ─── State + Filtering ─────────────────────────────────────────────────────
// Branche-Wert in HubSpot für den Hotels-Filter
const ACCOMODATION_VALUE = "Accomodation";

function createState() {
  return {
    stores: [],
    filters: {
      tags: new Set(),
      premiumPartner: false,
      looopsStore: false,
      accomodation: false,
      search: "",
    },
    activeId: null,
    map: null,
    markers: new Map(),
  };
}

function filterStores(state) {
  const f = state.filters;
  const q = f.search.trim().toLowerCase();

  // Premium Partner / Looops Store / Hotels: OR untereinander, AND mit den anderen Filtern.
  const categoryChecks = [];
  if (f.premiumPartner) categoryChecks.push((s) => s.premium_partner);
  if (f.looopsStore) categoryChecks.push((s) => s.looops_store);
  if (f.accomodation) categoryChecks.push((s) => s.branche === ACCOMODATION_VALUE);

  return state.stores.filter((s) => {
    if (f.tags.size > 0 && !Array.from(f.tags).every((t) => s.tags.includes(t))) return false;
    if (categoryChecks.length > 0 && !categoryChecks.some((fn) => fn(s))) return false;
    if (q) {
      const hay = [s.name, s.address.city, s.address.zip, s.address.street]
        .join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

// ─── UI Rendering ──────────────────────────────────────────────────────────
function renderShell(container, state, onChange) {
  container.classList.add("lsf-root");
  container.innerHTML = "";

  // Filter bar
  const filterBar = h("div", { class: "lsf-filters" });

  // Tag chips
  const tagRow = h("div", { class: "lsf-chip-row" });
  for (const t of TAG_LABELS) {
    const chip = h("button", {
      class: "lsf-chip",
      type: "button",
      "aria-pressed": "false",
      onclick: () => {
        if (state.filters.tags.has(t)) state.filters.tags.delete(t);
        else state.filters.tags.add(t);
        chip.setAttribute("aria-pressed", state.filters.tags.has(t) ? "true" : "false");
        chip.classList.toggle("is-active", state.filters.tags.has(t));
        onChange();
      },
    }, t);
    tagRow.appendChild(chip);
  }
  filterBar.appendChild(tagRow);

  // Category toggles + Branche dropdown + Search
  const controlRow = h("div", { class: "lsf-control-row" });

  const premiumChip = h("button", {
    class: "lsf-chip lsf-chip-accent",
    type: "button",
    onclick: () => {
      state.filters.premiumPartner = !state.filters.premiumPartner;
      premiumChip.classList.toggle("is-active", state.filters.premiumPartner);
      onChange();
    },
  }, "Premium Partner");
  controlRow.appendChild(premiumChip);

  const looopsChip = h("button", {
    class: "lsf-chip lsf-chip-accent",
    type: "button",
    onclick: () => {
      state.filters.looopsStore = !state.filters.looopsStore;
      looopsChip.classList.toggle("is-active", state.filters.looopsStore);
      onChange();
    },
  }, "Looops Store");
  controlRow.appendChild(looopsChip);

  const accomodationChip = h("button", {
    class: "lsf-chip lsf-chip-accent",
    type: "button",
    onclick: () => {
      state.filters.accomodation = !state.filters.accomodation;
      accomodationChip.classList.toggle("is-active", state.filters.accomodation);
      onChange();
    },
  }, "Hotels");
  controlRow.appendChild(accomodationChip);

  const search = h("input", {
    class: "lsf-search",
    type: "search",
    placeholder: "PLZ, Ort oder Name …",
    oninput: (e) => {
      state.filters.search = e.target.value;
      onChange();
    },
  });
  controlRow.appendChild(search);

  filterBar.appendChild(controlRow);
  container.appendChild(filterBar);

  // Split view: list + map
  const split = h("div", { class: "lsf-split" });
  const listWrap = h("div", { class: "lsf-list-wrap" });
  const listHeader = h("div", { class: "lsf-list-header" });
  const list = h("ul", { class: "lsf-list" });
  listWrap.appendChild(listHeader);
  listWrap.appendChild(list);
  const mapWrap = h("div", { class: "lsf-map-wrap" });
  const mapEl = h("div", { class: "lsf-map" });
  mapWrap.appendChild(mapEl);
  split.appendChild(listWrap);
  split.appendChild(mapWrap);
  container.appendChild(split);

  return { listHeader, list, mapEl };
}

function renderList(listHeader, listEl, stores, state, onSelect) {
  listHeader.textContent = stores.length === 1
    ? "1 Store"
    : `${stores.length} Stores`;
  listEl.innerHTML = "";
  if (stores.length === 0) {
    listEl.appendChild(h("li", { class: "lsf-empty" },
      "Keine Stores für die aktuelle Auswahl. Filter zurücksetzen."));
    return;
  }
  for (const s of stores) {
    const li = h("li", {
      class: "lsf-card" + (state.activeId === s.id ? " is-active" : ""),
      onclick: () => onSelect(s),
    }, [
      h("div", { class: "lsf-card-name" }, s.name || "Unbenannt"),
      s.address.street || s.address.city
        ? h("div", { class: "lsf-card-addr" }, [
            s.address.street ? h("span", {}, s.address.street) : null,
            s.address.street && (s.address.zip || s.address.city) ? h("br") : null,
            [s.address.zip, s.address.city].filter(Boolean).join(" "),
            s.address.country ? `, ${s.address.country}` : "",
          ].filter(Boolean))
        : null,
      s.tags.length
        ? h("div", { class: "lsf-card-tags" },
            s.tags.map((t) => h("span", { class: "lsf-tag" }, t)))
        : null,
      h("div", { class: "lsf-card-meta" }, [
        s.premium_partner ? h("span", { class: "lsf-badge" }, "Premium Partner") : null,
        s.looops_store ? h("span", { class: "lsf-badge" }, "Looops Store") : null,
        s.branche ? h("span", { class: "lsf-badge lsf-badge-quiet" }, s.branche) : null,
      ].filter(Boolean)),
      s.website || s.phone
        ? h("div", { class: "lsf-card-links" }, [
            s.website
              ? h("a", {
                  href: /^https?:/.test(s.website) ? s.website : `https://${s.website}`,
                  target: "_blank",
                  rel: "noopener",
                  onclick: (e) => e.stopPropagation(),
                }, "Website")
              : null,
            s.phone
              ? h("a", { href: `tel:${s.phone}`, onclick: (e) => e.stopPropagation() }, s.phone)
              : null,
          ].filter(Boolean))
        : null,
    ]);
    listEl.appendChild(li);
  }
}

// ─── Map ───────────────────────────────────────────────────────────────────
async function setupMap(mapEl, state, options, onSelect) {
  await Promise.all([loadCss(MAPBOX_CSS), loadScript(MAPBOX_JS)]);
  window.mapboxgl.accessToken = options.mapboxToken;
  state.map = new window.mapboxgl.Map({
    container: mapEl,
    style: options.mapStyle || "mapbox://styles/mapbox/light-v11",
    center: options.defaultCenter || [13.5, 47.6],
    zoom: options.defaultZoom || 5.8,
    attributionControl: false,
  });
  state.map.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  state.map.addControl(new window.mapboxgl.AttributionControl({ compact: true }));
  await new Promise((r) => state.map.once("load", r));
}

function renderMarkers(state, stores, onSelect) {
  // Diff vs. existing markers (cheap for our scale)
  const wantedIds = new Set(stores.map((s) => s.id));
  for (const [id, m] of state.markers) {
    if (!wantedIds.has(id)) { m.remove(); state.markers.delete(id); }
  }
  for (const s of stores) {
    if (state.markers.has(s.id)) {
      const m = state.markers.get(s.id);
      m.getElement().classList.toggle("is-active", state.activeId === s.id);
      continue;
    }
    const el = document.createElement("div");
    el.className = "lsf-marker" + (state.activeId === s.id ? " is-active" : "");
    if (s.premium_partner) el.classList.add("is-premium");
    el.addEventListener("click", (e) => { e.stopPropagation(); onSelect(s); });
    const marker = new window.mapboxgl.Marker(el).setLngLat([s.lng, s.lat]).addTo(state.map);
    state.markers.set(s.id, marker);
  }
}

function fitMapToStores(state, stores) {
  if (!stores.length || !state.map) return;
  if (stores.length === 1) {
    state.map.flyTo({ center: [stores[0].lng, stores[0].lat], zoom: 13 });
    return;
  }
  const bounds = new window.mapboxgl.LngLatBounds();
  for (const s of stores) bounds.extend([s.lng, s.lat]);
  state.map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 400 });
}

// ─── Init ──────────────────────────────────────────────────────────────────
export async function init(container, options = {}) {
  if (!container) throw new Error("Looops Storefinder: container missing");
  if (!options.dataUrl && !options.data)
    throw new Error("Looops Storefinder: dataUrl oder data missing");
  if (!options.mapboxToken) throw new Error("Looops Storefinder: mapboxToken missing");

  const state = createState();
  container.classList.add("lsf-root");
  container.innerHTML = `<div class="lsf-loading">Lade Stores …</div>`;

  let data = options.data;
  if (!data) {
    try {
      const res = await fetch(options.dataUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      container.innerHTML = `<div class="lsf-error">Stores konnten nicht geladen werden. (${escapeHtml(err.message)})</div>`;
      return;
    }
  }
  state.stores = (data.stores || []).filter((s) => s.lat && s.lng);

  const update = () => {
    const filtered = filterStores(state);
    renderList(listHeader, list, filtered, state, onSelect);
    renderMarkers(state, filtered, onSelect);
  };

  const onSelect = (s) => {
    state.activeId = s.id;
    state.map?.flyTo({ center: [s.lng, s.lat], zoom: 13, duration: 600 });
    update();
  };

  const { listHeader, list, mapEl } = renderShell(container, state, update);

  await setupMap(mapEl, state, options, onSelect);
  renderMarkers(state, state.stores, onSelect);
  fitMapToStores(state, state.stores);
  renderList(listHeader, list, state.stores, state, onSelect);
}

// Auto-init: <div data-looops-storefinder data-data-url="…" data-mapbox-token="…">
function autoInit() {
  for (const el of document.querySelectorAll("[data-looops-storefinder]")) {
    if (el.dataset.lsfInitialised) continue;
    el.dataset.lsfInitialised = "1";
    init(el, {
      dataUrl: el.dataset.dataUrl,
      mapboxToken: el.dataset.mapboxToken,
      defaultCenter: el.dataset.defaultCenter
        ? el.dataset.defaultCenter.split(",").map(Number)
        : undefined,
      defaultZoom: el.dataset.defaultZoom ? Number(el.dataset.defaultZoom) : undefined,
      mapStyle: el.dataset.mapStyle || undefined,
    }).catch((err) => console.error("Looops Storefinder:", err));
  }
}

if (document.readyState !== "loading") autoInit();
else document.addEventListener("DOMContentLoaded", autoInit);
