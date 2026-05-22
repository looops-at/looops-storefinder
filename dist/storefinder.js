/* Looops Storefinder — github.com/looops/looops-storefinder */
"use strict";
var LooopsStorefinder = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/storefinder.js
  var storefinder_exports = {};
  __export(storefinder_exports, {
    init: () => init
  });
  var TAG_LABELS = [
    "Duftkerzen",
    "Duftspray",
    "Duftst\xE4bchen",
    "Aroma Diffuser",
    "\xC4therische \xD6le"
  ];
  var MAPBOX_CSS = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css";
  var MAPBOX_JS = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js";
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
  var h = (tag, attrs = {}, children = []) => {
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
  var escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
  var ACCOMODATION_VALUE = "Accomodation";
  function createState() {
    return {
      stores: [],
      filters: {
        tags: /* @__PURE__ */ new Set(),
        premiumPartner: false,
        looopsStore: false,
        accomodation: false,
        search: ""
      },
      activeId: null,
      map: null,
      markers: /* @__PURE__ */ new Map()
    };
  }
  function filterStores(state) {
    const f = state.filters;
    const q = f.search.trim().toLowerCase();
    const categoryChecks = [];
    if (f.premiumPartner) categoryChecks.push((s) => s.premium_partner);
    if (f.looopsStore) categoryChecks.push((s) => s.looops_store);
    if (f.accomodation) categoryChecks.push((s) => s.branche === ACCOMODATION_VALUE);
    return state.stores.filter((s) => {
      if (f.tags.size > 0 && !Array.from(f.tags).every((t) => s.tags.includes(t))) return false;
      if (categoryChecks.length > 0 && !categoryChecks.some((fn) => fn(s))) return false;
      if (q) {
        const hay = [s.name, s.address.city, s.address.zip, s.address.street].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }
  function renderShell(container, state, onChange) {
    container.classList.add("lsf-root");
    container.innerHTML = "";
    const filterBar = h("div", { class: "lsf-filters" });
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
        }
      }, t);
      tagRow.appendChild(chip);
    }
    filterBar.appendChild(tagRow);
    const controlRow = h("div", { class: "lsf-control-row" });
    const premiumChip = h("button", {
      class: "lsf-chip lsf-chip-accent",
      type: "button",
      onclick: () => {
        state.filters.premiumPartner = !state.filters.premiumPartner;
        premiumChip.classList.toggle("is-active", state.filters.premiumPartner);
        onChange();
      }
    }, "Premium Partner");
    controlRow.appendChild(premiumChip);
    const looopsChip = h("button", {
      class: "lsf-chip lsf-chip-accent",
      type: "button",
      onclick: () => {
        state.filters.looopsStore = !state.filters.looopsStore;
        looopsChip.classList.toggle("is-active", state.filters.looopsStore);
        onChange();
      }
    }, "Looops Store");
    controlRow.appendChild(looopsChip);
    const accomodationChip = h("button", {
      class: "lsf-chip lsf-chip-accent",
      type: "button",
      onclick: () => {
        state.filters.accomodation = !state.filters.accomodation;
        accomodationChip.classList.toggle("is-active", state.filters.accomodation);
        onChange();
      }
    }, "Hotels");
    controlRow.appendChild(accomodationChip);
    const search = h("input", {
      class: "lsf-search",
      type: "search",
      placeholder: "PLZ, Ort oder Name \u2026",
      oninput: (e) => {
        state.filters.search = e.target.value;
        onChange();
      }
    });
    controlRow.appendChild(search);
    filterBar.appendChild(controlRow);
    container.appendChild(filterBar);
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
    listHeader.textContent = stores.length === 1 ? "1 Store" : `${stores.length} Stores`;
    listEl.innerHTML = "";
    if (stores.length === 0) {
      listEl.appendChild(h(
        "li",
        { class: "lsf-empty" },
        "Keine Stores f\xFCr die aktuelle Auswahl. Filter zur\xFCcksetzen."
      ));
      return;
    }
    for (const s of stores) {
      const li = h("li", {
        class: "lsf-card" + (state.activeId === s.id ? " is-active" : ""),
        onclick: () => onSelect(s)
      }, [
        h("div", { class: "lsf-card-name" }, s.name || "Unbenannt"),
        s.address.street || s.address.city ? h("div", { class: "lsf-card-addr" }, [
          s.address.street ? h("span", {}, s.address.street) : null,
          s.address.street && (s.address.zip || s.address.city) ? h("br") : null,
          [s.address.zip, s.address.city].filter(Boolean).join(" "),
          s.address.country ? `, ${s.address.country}` : ""
        ].filter(Boolean)) : null,
        s.tags.length ? h(
          "div",
          { class: "lsf-card-tags" },
          s.tags.map((t) => h("span", { class: "lsf-tag" }, t))
        ) : null,
        h("div", { class: "lsf-card-meta" }, [
          s.premium_partner ? h("span", { class: "lsf-badge" }, "Premium Partner") : null,
          s.looops_store ? h("span", { class: "lsf-badge" }, "Looops Store") : null,
          s.branche ? h("span", { class: "lsf-badge lsf-badge-quiet" }, s.branche) : null
        ].filter(Boolean)),
        s.website || s.phone ? h("div", { class: "lsf-card-links" }, [
          s.website ? h("a", {
            href: /^https?:/.test(s.website) ? s.website : `https://${s.website}`,
            target: "_blank",
            rel: "noopener",
            onclick: (e) => e.stopPropagation()
          }, "Website") : null,
          s.phone ? h("a", { href: `tel:${s.phone}`, onclick: (e) => e.stopPropagation() }, s.phone) : null
        ].filter(Boolean)) : null
      ]);
      listEl.appendChild(li);
    }
  }
  async function setupMap(mapEl, state, options, onSelect) {
    await Promise.all([loadCss(MAPBOX_CSS), loadScript(MAPBOX_JS)]);
    window.mapboxgl.accessToken = options.mapboxToken;
    state.map = new window.mapboxgl.Map({
      container: mapEl,
      style: options.mapStyle || "mapbox://styles/mapbox/light-v11",
      center: options.defaultCenter || [13.5, 47.6],
      zoom: options.defaultZoom || 5.8,
      attributionControl: false
    });
    state.map.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    state.map.addControl(new window.mapboxgl.AttributionControl({ compact: true }));
    await new Promise((r) => state.map.once("load", r));
  }
  function renderMarkers(state, stores, onSelect) {
    const wantedIds = new Set(stores.map((s) => s.id));
    for (const [id, m] of state.markers) {
      if (!wantedIds.has(id)) {
        m.remove();
        state.markers.delete(id);
      }
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
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelect(s);
      });
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
  async function init(container, options = {}) {
    if (!container) throw new Error("Looops Storefinder: container missing");
    if (!options.dataUrl && !options.data)
      throw new Error("Looops Storefinder: dataUrl oder data missing");
    if (!options.mapboxToken) throw new Error("Looops Storefinder: mapboxToken missing");
    const state = createState();
    container.classList.add("lsf-root");
    container.innerHTML = `<div class="lsf-loading">Lade Stores \u2026</div>`;
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
  function autoInit() {
    for (const el of document.querySelectorAll("[data-looops-storefinder]")) {
      if (el.dataset.lsfInitialised) continue;
      el.dataset.lsfInitialised = "1";
      init(el, {
        dataUrl: el.dataset.dataUrl,
        mapboxToken: el.dataset.mapboxToken,
        defaultCenter: el.dataset.defaultCenter ? el.dataset.defaultCenter.split(",").map(Number) : void 0,
        defaultZoom: el.dataset.defaultZoom ? Number(el.dataset.defaultZoom) : void 0,
        mapStyle: el.dataset.mapStyle || void 0
      }).catch((err) => console.error("Looops Storefinder:", err));
    }
  }
  if (document.readyState !== "loading") autoInit();
  else document.addEventListener("DOMContentLoaded", autoInit);
  return __toCommonJS(storefinder_exports);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3N0b3JlZmluZGVyLmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIExvb29wcyBTdG9yZWZpbmRlciBcdTIwMTQgVmFuaWxsYS1KUy1CdW5kbGVcbiAqXG4gKiBVc2FnZTpcbiAqICAgPGRpdiBpZD1cInN0b3JlZmluZGVyXCI+PC9kaXY+XG4gKiAgIDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0Ly4uLi9zdG9yZWZpbmRlci5qc1wiPjwvc2NyaXB0PlxuICogICA8c2NyaXB0PlxuICogICAgIExvb29wc1N0b3JlZmluZGVyLmluaXQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0b3JlZmluZGVyJyksIHtcbiAqICAgICAgIGRhdGFVcmw6ICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvLi4uL3N0b3Jlcy5qc29uJyxcbiAqICAgICAgIG1hcGJveFRva2VuOiAncGsuZXlKMS4uLicsXG4gKiAgICAgICBkZWZhdWx0Q2VudGVyOiBbMTMuNSwgNDcuNl0sXG4gKiAgICAgICBkZWZhdWx0Wm9vbTogNS44LFxuICogICAgIH0pO1xuICogICA8L3NjcmlwdD5cbiAqL1xuXG5jb25zdCBUQUdfTEFCRUxTID0gW1xuICBcIkR1ZnRrZXJ6ZW5cIixcbiAgXCJEdWZ0c3ByYXlcIixcbiAgXCJEdWZ0c3RcdTAwRTRiY2hlblwiLFxuICBcIkFyb21hIERpZmZ1c2VyXCIsXG4gIFwiXHUwMEM0dGhlcmlzY2hlIFx1MDBENmxlXCIsXG5dO1xuXG5jb25zdCBNQVBCT1hfQ1NTID0gXCJodHRwczovL2FwaS5tYXBib3guY29tL21hcGJveC1nbC1qcy92My42LjAvbWFwYm94LWdsLmNzc1wiO1xuY29uc3QgTUFQQk9YX0pTID0gXCJodHRwczovL2FwaS5tYXBib3guY29tL21hcGJveC1nbC1qcy92My42LjAvbWFwYm94LWdsLmpzXCI7XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBBc3NldCBMb2FkaW5nIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZnVuY3Rpb24gbG9hZENzcyhocmVmKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoYGxpbmtbaHJlZj1cIiR7aHJlZn1cIl1gKSkgcmV0dXJuIHJlc29sdmUoKTtcbiAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpbmtcIik7XG4gICAgbGluay5yZWwgPSBcInN0eWxlc2hlZXRcIjtcbiAgICBsaW5rLmhyZWYgPSBocmVmO1xuICAgIGxpbmsub25sb2FkID0gcmVzb2x2ZTtcbiAgICBsaW5rLm9uZXJyb3IgPSByZWplY3Q7XG4gICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChsaW5rKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRTY3JpcHQoc3JjKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgaWYgKHdpbmRvdy5tYXBib3hnbCkgcmV0dXJuIHJlc29sdmUoKTtcbiAgICBjb25zdCBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbiAgICBzLnNyYyA9IHNyYztcbiAgICBzLm9ubG9hZCA9IHJlc29sdmU7XG4gICAgcy5vbmVycm9yID0gcmVqZWN0O1xuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQocyk7XG4gIH0pO1xufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgSFRNTCBoZWxwZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuY29uc3QgaCA9ICh0YWcsIGF0dHJzID0ge30sIGNoaWxkcmVuID0gW10pID0+IHtcbiAgY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7XG4gIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGF0dHJzKSkge1xuICAgIGlmIChrID09PSBcImNsYXNzXCIpIGVsLmNsYXNzTmFtZSA9IHY7XG4gICAgZWxzZSBpZiAoayA9PT0gXCJodG1sXCIpIGVsLmlubmVySFRNTCA9IHY7XG4gICAgZWxzZSBpZiAoay5zdGFydHNXaXRoKFwib25cIikpIGVsLmFkZEV2ZW50TGlzdGVuZXIoay5zbGljZSgyKSwgdik7XG4gICAgZWxzZSBpZiAodiAhPT0gZmFsc2UgJiYgdiAhPSBudWxsKSBlbC5zZXRBdHRyaWJ1dGUoaywgdiA9PT0gdHJ1ZSA/IFwiXCIgOiB2KTtcbiAgfVxuICBmb3IgKGNvbnN0IGMgb2YgW10uY29uY2F0KGNoaWxkcmVuKSkge1xuICAgIGlmIChjID09IG51bGwgfHwgYyA9PT0gZmFsc2UpIGNvbnRpbnVlO1xuICAgIGVsLmFwcGVuZENoaWxkKHR5cGVvZiBjID09PSBcInN0cmluZ1wiID8gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYykgOiBjKTtcbiAgfVxuICByZXR1cm4gZWw7XG59O1xuXG5jb25zdCBlc2NhcGVIdG1sID0gKHMpID0+XG4gIFN0cmluZyhzID8/IFwiXCIpLnJlcGxhY2UoL1smPD5cIiddL2csIChjKSA9PiAoe1xuICAgIFwiJlwiOiBcIiZhbXA7XCIsIFwiPFwiOiBcIiZsdDtcIiwgXCI+XCI6IFwiJmd0O1wiLCAnXCInOiBcIiZxdW90O1wiLCBcIidcIjogXCImIzM5O1wiLFxuICB9KVtjXSk7XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTdGF0ZSArIEZpbHRlcmluZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEJyYW5jaGUtV2VydCBpbiBIdWJTcG90IGZcdTAwRkNyIGRlbiBIb3RlbHMtRmlsdGVyXG5jb25zdCBBQ0NPTU9EQVRJT05fVkFMVUUgPSBcIkFjY29tb2RhdGlvblwiO1xuXG5mdW5jdGlvbiBjcmVhdGVTdGF0ZSgpIHtcbiAgcmV0dXJuIHtcbiAgICBzdG9yZXM6IFtdLFxuICAgIGZpbHRlcnM6IHtcbiAgICAgIHRhZ3M6IG5ldyBTZXQoKSxcbiAgICAgIHByZW1pdW1QYXJ0bmVyOiBmYWxzZSxcbiAgICAgIGxvb29wc1N0b3JlOiBmYWxzZSxcbiAgICAgIGFjY29tb2RhdGlvbjogZmFsc2UsXG4gICAgICBzZWFyY2g6IFwiXCIsXG4gICAgfSxcbiAgICBhY3RpdmVJZDogbnVsbCxcbiAgICBtYXA6IG51bGwsXG4gICAgbWFya2VyczogbmV3IE1hcCgpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJTdG9yZXMoc3RhdGUpIHtcbiAgY29uc3QgZiA9IHN0YXRlLmZpbHRlcnM7XG4gIGNvbnN0IHEgPSBmLnNlYXJjaC50cmltKCkudG9Mb3dlckNhc2UoKTtcblxuICAvLyBQcmVtaXVtIFBhcnRuZXIgLyBMb29vcHMgU3RvcmUgLyBIb3RlbHM6IE9SIHVudGVyZWluYW5kZXIsIEFORCBtaXQgZGVuIGFuZGVyZW4gRmlsdGVybi5cbiAgY29uc3QgY2F0ZWdvcnlDaGVja3MgPSBbXTtcbiAgaWYgKGYucHJlbWl1bVBhcnRuZXIpIGNhdGVnb3J5Q2hlY2tzLnB1c2goKHMpID0+IHMucHJlbWl1bV9wYXJ0bmVyKTtcbiAgaWYgKGYubG9vb3BzU3RvcmUpIGNhdGVnb3J5Q2hlY2tzLnB1c2goKHMpID0+IHMubG9vb3BzX3N0b3JlKTtcbiAgaWYgKGYuYWNjb21vZGF0aW9uKSBjYXRlZ29yeUNoZWNrcy5wdXNoKChzKSA9PiBzLmJyYW5jaGUgPT09IEFDQ09NT0RBVElPTl9WQUxVRSk7XG5cbiAgcmV0dXJuIHN0YXRlLnN0b3Jlcy5maWx0ZXIoKHMpID0+IHtcbiAgICBpZiAoZi50YWdzLnNpemUgPiAwICYmICFBcnJheS5mcm9tKGYudGFncykuZXZlcnkoKHQpID0+IHMudGFncy5pbmNsdWRlcyh0KSkpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoY2F0ZWdvcnlDaGVja3MubGVuZ3RoID4gMCAmJiAhY2F0ZWdvcnlDaGVja3Muc29tZSgoZm4pID0+IGZuKHMpKSkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChxKSB7XG4gICAgICBjb25zdCBoYXkgPSBbcy5uYW1lLCBzLmFkZHJlc3MuY2l0eSwgcy5hZGRyZXNzLnppcCwgcy5hZGRyZXNzLnN0cmVldF1cbiAgICAgICAgLmpvaW4oXCIgXCIpLnRvTG93ZXJDYXNlKCk7XG4gICAgICBpZiAoIWhheS5pbmNsdWRlcyhxKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBVSSBSZW5kZXJpbmcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5mdW5jdGlvbiByZW5kZXJTaGVsbChjb250YWluZXIsIHN0YXRlLCBvbkNoYW5nZSkge1xuICBjb250YWluZXIuY2xhc3NMaXN0LmFkZChcImxzZi1yb290XCIpO1xuICBjb250YWluZXIuaW5uZXJIVE1MID0gXCJcIjtcblxuICAvLyBGaWx0ZXIgYmFyXG4gIGNvbnN0IGZpbHRlckJhciA9IGgoXCJkaXZcIiwgeyBjbGFzczogXCJsc2YtZmlsdGVyc1wiIH0pO1xuXG4gIC8vIFRhZyBjaGlwc1xuICBjb25zdCB0YWdSb3cgPSBoKFwiZGl2XCIsIHsgY2xhc3M6IFwibHNmLWNoaXAtcm93XCIgfSk7XG4gIGZvciAoY29uc3QgdCBvZiBUQUdfTEFCRUxTKSB7XG4gICAgY29uc3QgY2hpcCA9IGgoXCJidXR0b25cIiwge1xuICAgICAgY2xhc3M6IFwibHNmLWNoaXBcIixcbiAgICAgIHR5cGU6IFwiYnV0dG9uXCIsXG4gICAgICBcImFyaWEtcHJlc3NlZFwiOiBcImZhbHNlXCIsXG4gICAgICBvbmNsaWNrOiAoKSA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5maWx0ZXJzLnRhZ3MuaGFzKHQpKSBzdGF0ZS5maWx0ZXJzLnRhZ3MuZGVsZXRlKHQpO1xuICAgICAgICBlbHNlIHN0YXRlLmZpbHRlcnMudGFncy5hZGQodCk7XG4gICAgICAgIGNoaXAuc2V0QXR0cmlidXRlKFwiYXJpYS1wcmVzc2VkXCIsIHN0YXRlLmZpbHRlcnMudGFncy5oYXModCkgPyBcInRydWVcIiA6IFwiZmFsc2VcIik7XG4gICAgICAgIGNoaXAuY2xhc3NMaXN0LnRvZ2dsZShcImlzLWFjdGl2ZVwiLCBzdGF0ZS5maWx0ZXJzLnRhZ3MuaGFzKHQpKTtcbiAgICAgICAgb25DaGFuZ2UoKTtcbiAgICAgIH0sXG4gICAgfSwgdCk7XG4gICAgdGFnUm93LmFwcGVuZENoaWxkKGNoaXApO1xuICB9XG4gIGZpbHRlckJhci5hcHBlbmRDaGlsZCh0YWdSb3cpO1xuXG4gIC8vIENhdGVnb3J5IHRvZ2dsZXMgKyBCcmFuY2hlIGRyb3Bkb3duICsgU2VhcmNoXG4gIGNvbnN0IGNvbnRyb2xSb3cgPSBoKFwiZGl2XCIsIHsgY2xhc3M6IFwibHNmLWNvbnRyb2wtcm93XCIgfSk7XG5cbiAgY29uc3QgcHJlbWl1bUNoaXAgPSBoKFwiYnV0dG9uXCIsIHtcbiAgICBjbGFzczogXCJsc2YtY2hpcCBsc2YtY2hpcC1hY2NlbnRcIixcbiAgICB0eXBlOiBcImJ1dHRvblwiLFxuICAgIG9uY2xpY2s6ICgpID0+IHtcbiAgICAgIHN0YXRlLmZpbHRlcnMucHJlbWl1bVBhcnRuZXIgPSAhc3RhdGUuZmlsdGVycy5wcmVtaXVtUGFydG5lcjtcbiAgICAgIHByZW1pdW1DaGlwLmNsYXNzTGlzdC50b2dnbGUoXCJpcy1hY3RpdmVcIiwgc3RhdGUuZmlsdGVycy5wcmVtaXVtUGFydG5lcik7XG4gICAgICBvbkNoYW5nZSgpO1xuICAgIH0sXG4gIH0sIFwiUHJlbWl1bSBQYXJ0bmVyXCIpO1xuICBjb250cm9sUm93LmFwcGVuZENoaWxkKHByZW1pdW1DaGlwKTtcblxuICBjb25zdCBsb29vcHNDaGlwID0gaChcImJ1dHRvblwiLCB7XG4gICAgY2xhc3M6IFwibHNmLWNoaXAgbHNmLWNoaXAtYWNjZW50XCIsXG4gICAgdHlwZTogXCJidXR0b25cIixcbiAgICBvbmNsaWNrOiAoKSA9PiB7XG4gICAgICBzdGF0ZS5maWx0ZXJzLmxvb29wc1N0b3JlID0gIXN0YXRlLmZpbHRlcnMubG9vb3BzU3RvcmU7XG4gICAgICBsb29vcHNDaGlwLmNsYXNzTGlzdC50b2dnbGUoXCJpcy1hY3RpdmVcIiwgc3RhdGUuZmlsdGVycy5sb29vcHNTdG9yZSk7XG4gICAgICBvbkNoYW5nZSgpO1xuICAgIH0sXG4gIH0sIFwiTG9vb3BzIFN0b3JlXCIpO1xuICBjb250cm9sUm93LmFwcGVuZENoaWxkKGxvb29wc0NoaXApO1xuXG4gIGNvbnN0IGFjY29tb2RhdGlvbkNoaXAgPSBoKFwiYnV0dG9uXCIsIHtcbiAgICBjbGFzczogXCJsc2YtY2hpcCBsc2YtY2hpcC1hY2NlbnRcIixcbiAgICB0eXBlOiBcImJ1dHRvblwiLFxuICAgIG9uY2xpY2s6ICgpID0+IHtcbiAgICAgIHN0YXRlLmZpbHRlcnMuYWNjb21vZGF0aW9uID0gIXN0YXRlLmZpbHRlcnMuYWNjb21vZGF0aW9uO1xuICAgICAgYWNjb21vZGF0aW9uQ2hpcC5jbGFzc0xpc3QudG9nZ2xlKFwiaXMtYWN0aXZlXCIsIHN0YXRlLmZpbHRlcnMuYWNjb21vZGF0aW9uKTtcbiAgICAgIG9uQ2hhbmdlKCk7XG4gICAgfSxcbiAgfSwgXCJIb3RlbHNcIik7XG4gIGNvbnRyb2xSb3cuYXBwZW5kQ2hpbGQoYWNjb21vZGF0aW9uQ2hpcCk7XG5cbiAgY29uc3Qgc2VhcmNoID0gaChcImlucHV0XCIsIHtcbiAgICBjbGFzczogXCJsc2Ytc2VhcmNoXCIsXG4gICAgdHlwZTogXCJzZWFyY2hcIixcbiAgICBwbGFjZWhvbGRlcjogXCJQTFosIE9ydCBvZGVyIE5hbWUgXHUyMDI2XCIsXG4gICAgb25pbnB1dDogKGUpID0+IHtcbiAgICAgIHN0YXRlLmZpbHRlcnMuc2VhcmNoID0gZS50YXJnZXQudmFsdWU7XG4gICAgICBvbkNoYW5nZSgpO1xuICAgIH0sXG4gIH0pO1xuICBjb250cm9sUm93LmFwcGVuZENoaWxkKHNlYXJjaCk7XG5cbiAgZmlsdGVyQmFyLmFwcGVuZENoaWxkKGNvbnRyb2xSb3cpO1xuICBjb250YWluZXIuYXBwZW5kQ2hpbGQoZmlsdGVyQmFyKTtcblxuICAvLyBTcGxpdCB2aWV3OiBsaXN0ICsgbWFwXG4gIGNvbnN0IHNwbGl0ID0gaChcImRpdlwiLCB7IGNsYXNzOiBcImxzZi1zcGxpdFwiIH0pO1xuICBjb25zdCBsaXN0V3JhcCA9IGgoXCJkaXZcIiwgeyBjbGFzczogXCJsc2YtbGlzdC13cmFwXCIgfSk7XG4gIGNvbnN0IGxpc3RIZWFkZXIgPSBoKFwiZGl2XCIsIHsgY2xhc3M6IFwibHNmLWxpc3QtaGVhZGVyXCIgfSk7XG4gIGNvbnN0IGxpc3QgPSBoKFwidWxcIiwgeyBjbGFzczogXCJsc2YtbGlzdFwiIH0pO1xuICBsaXN0V3JhcC5hcHBlbmRDaGlsZChsaXN0SGVhZGVyKTtcbiAgbGlzdFdyYXAuYXBwZW5kQ2hpbGQobGlzdCk7XG4gIGNvbnN0IG1hcFdyYXAgPSBoKFwiZGl2XCIsIHsgY2xhc3M6IFwibHNmLW1hcC13cmFwXCIgfSk7XG4gIGNvbnN0IG1hcEVsID0gaChcImRpdlwiLCB7IGNsYXNzOiBcImxzZi1tYXBcIiB9KTtcbiAgbWFwV3JhcC5hcHBlbmRDaGlsZChtYXBFbCk7XG4gIHNwbGl0LmFwcGVuZENoaWxkKGxpc3RXcmFwKTtcbiAgc3BsaXQuYXBwZW5kQ2hpbGQobWFwV3JhcCk7XG4gIGNvbnRhaW5lci5hcHBlbmRDaGlsZChzcGxpdCk7XG5cbiAgcmV0dXJuIHsgbGlzdEhlYWRlciwgbGlzdCwgbWFwRWwgfTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyTGlzdChsaXN0SGVhZGVyLCBsaXN0RWwsIHN0b3Jlcywgc3RhdGUsIG9uU2VsZWN0KSB7XG4gIGxpc3RIZWFkZXIudGV4dENvbnRlbnQgPSBzdG9yZXMubGVuZ3RoID09PSAxXG4gICAgPyBcIjEgU3RvcmVcIlxuICAgIDogYCR7c3RvcmVzLmxlbmd0aH0gU3RvcmVzYDtcbiAgbGlzdEVsLmlubmVySFRNTCA9IFwiXCI7XG4gIGlmIChzdG9yZXMubGVuZ3RoID09PSAwKSB7XG4gICAgbGlzdEVsLmFwcGVuZENoaWxkKGgoXCJsaVwiLCB7IGNsYXNzOiBcImxzZi1lbXB0eVwiIH0sXG4gICAgICBcIktlaW5lIFN0b3JlcyBmXHUwMEZDciBkaWUgYWt0dWVsbGUgQXVzd2FobC4gRmlsdGVyIHp1clx1MDBGQ2Nrc2V0emVuLlwiKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZvciAoY29uc3QgcyBvZiBzdG9yZXMpIHtcbiAgICBjb25zdCBsaSA9IGgoXCJsaVwiLCB7XG4gICAgICBjbGFzczogXCJsc2YtY2FyZFwiICsgKHN0YXRlLmFjdGl2ZUlkID09PSBzLmlkID8gXCIgaXMtYWN0aXZlXCIgOiBcIlwiKSxcbiAgICAgIG9uY2xpY2s6ICgpID0+IG9uU2VsZWN0KHMpLFxuICAgIH0sIFtcbiAgICAgIGgoXCJkaXZcIiwgeyBjbGFzczogXCJsc2YtY2FyZC1uYW1lXCIgfSwgcy5uYW1lIHx8IFwiVW5iZW5hbm50XCIpLFxuICAgICAgcy5hZGRyZXNzLnN0cmVldCB8fCBzLmFkZHJlc3MuY2l0eVxuICAgICAgICA/IGgoXCJkaXZcIiwgeyBjbGFzczogXCJsc2YtY2FyZC1hZGRyXCIgfSwgW1xuICAgICAgICAgICAgcy5hZGRyZXNzLnN0cmVldCA/IGgoXCJzcGFuXCIsIHt9LCBzLmFkZHJlc3Muc3RyZWV0KSA6IG51bGwsXG4gICAgICAgICAgICBzLmFkZHJlc3Muc3RyZWV0ICYmIChzLmFkZHJlc3MuemlwIHx8IHMuYWRkcmVzcy5jaXR5KSA/IGgoXCJiclwiKSA6IG51bGwsXG4gICAgICAgICAgICBbcy5hZGRyZXNzLnppcCwgcy5hZGRyZXNzLmNpdHldLmZpbHRlcihCb29sZWFuKS5qb2luKFwiIFwiKSxcbiAgICAgICAgICAgIHMuYWRkcmVzcy5jb3VudHJ5ID8gYCwgJHtzLmFkZHJlc3MuY291bnRyeX1gIDogXCJcIixcbiAgICAgICAgICBdLmZpbHRlcihCb29sZWFuKSlcbiAgICAgICAgOiBudWxsLFxuICAgICAgcy50YWdzLmxlbmd0aFxuICAgICAgICA/IGgoXCJkaXZcIiwgeyBjbGFzczogXCJsc2YtY2FyZC10YWdzXCIgfSxcbiAgICAgICAgICAgIHMudGFncy5tYXAoKHQpID0+IGgoXCJzcGFuXCIsIHsgY2xhc3M6IFwibHNmLXRhZ1wiIH0sIHQpKSlcbiAgICAgICAgOiBudWxsLFxuICAgICAgaChcImRpdlwiLCB7IGNsYXNzOiBcImxzZi1jYXJkLW1ldGFcIiB9LCBbXG4gICAgICAgIHMucHJlbWl1bV9wYXJ0bmVyID8gaChcInNwYW5cIiwgeyBjbGFzczogXCJsc2YtYmFkZ2VcIiB9LCBcIlByZW1pdW0gUGFydG5lclwiKSA6IG51bGwsXG4gICAgICAgIHMubG9vb3BzX3N0b3JlID8gaChcInNwYW5cIiwgeyBjbGFzczogXCJsc2YtYmFkZ2VcIiB9LCBcIkxvb29wcyBTdG9yZVwiKSA6IG51bGwsXG4gICAgICAgIHMuYnJhbmNoZSA/IGgoXCJzcGFuXCIsIHsgY2xhc3M6IFwibHNmLWJhZGdlIGxzZi1iYWRnZS1xdWlldFwiIH0sIHMuYnJhbmNoZSkgOiBudWxsLFxuICAgICAgXS5maWx0ZXIoQm9vbGVhbikpLFxuICAgICAgcy53ZWJzaXRlIHx8IHMucGhvbmVcbiAgICAgICAgPyBoKFwiZGl2XCIsIHsgY2xhc3M6IFwibHNmLWNhcmQtbGlua3NcIiB9LCBbXG4gICAgICAgICAgICBzLndlYnNpdGVcbiAgICAgICAgICAgICAgPyBoKFwiYVwiLCB7XG4gICAgICAgICAgICAgICAgICBocmVmOiAvXmh0dHBzPzovLnRlc3Qocy53ZWJzaXRlKSA/IHMud2Vic2l0ZSA6IGBodHRwczovLyR7cy53ZWJzaXRlfWAsXG4gICAgICAgICAgICAgICAgICB0YXJnZXQ6IFwiX2JsYW5rXCIsXG4gICAgICAgICAgICAgICAgICByZWw6IFwibm9vcGVuZXJcIixcbiAgICAgICAgICAgICAgICAgIG9uY2xpY2s6IChlKSA9PiBlLnN0b3BQcm9wYWdhdGlvbigpLFxuICAgICAgICAgICAgICAgIH0sIFwiV2Vic2l0ZVwiKVxuICAgICAgICAgICAgICA6IG51bGwsXG4gICAgICAgICAgICBzLnBob25lXG4gICAgICAgICAgICAgID8gaChcImFcIiwgeyBocmVmOiBgdGVsOiR7cy5waG9uZX1gLCBvbmNsaWNrOiAoZSkgPT4gZS5zdG9wUHJvcGFnYXRpb24oKSB9LCBzLnBob25lKVxuICAgICAgICAgICAgICA6IG51bGwsXG4gICAgICAgICAgXS5maWx0ZXIoQm9vbGVhbikpXG4gICAgICAgIDogbnVsbCxcbiAgICBdKTtcbiAgICBsaXN0RWwuYXBwZW5kQ2hpbGQobGkpO1xuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBNYXAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5hc3luYyBmdW5jdGlvbiBzZXR1cE1hcChtYXBFbCwgc3RhdGUsIG9wdGlvbnMsIG9uU2VsZWN0KSB7XG4gIGF3YWl0IFByb21pc2UuYWxsKFtsb2FkQ3NzKE1BUEJPWF9DU1MpLCBsb2FkU2NyaXB0KE1BUEJPWF9KUyldKTtcbiAgd2luZG93Lm1hcGJveGdsLmFjY2Vzc1Rva2VuID0gb3B0aW9ucy5tYXBib3hUb2tlbjtcbiAgc3RhdGUubWFwID0gbmV3IHdpbmRvdy5tYXBib3hnbC5NYXAoe1xuICAgIGNvbnRhaW5lcjogbWFwRWwsXG4gICAgc3R5bGU6IG9wdGlvbnMubWFwU3R5bGUgfHwgXCJtYXBib3g6Ly9zdHlsZXMvbWFwYm94L2xpZ2h0LXYxMVwiLFxuICAgIGNlbnRlcjogb3B0aW9ucy5kZWZhdWx0Q2VudGVyIHx8IFsxMy41LCA0Ny42XSxcbiAgICB6b29tOiBvcHRpb25zLmRlZmF1bHRab29tIHx8IDUuOCxcbiAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IGZhbHNlLFxuICB9KTtcbiAgc3RhdGUubWFwLmFkZENvbnRyb2wobmV3IHdpbmRvdy5tYXBib3hnbC5OYXZpZ2F0aW9uQ29udHJvbCh7IHNob3dDb21wYXNzOiBmYWxzZSB9KSwgXCJ0b3AtcmlnaHRcIik7XG4gIHN0YXRlLm1hcC5hZGRDb250cm9sKG5ldyB3aW5kb3cubWFwYm94Z2wuQXR0cmlidXRpb25Db250cm9sKHsgY29tcGFjdDogdHJ1ZSB9KSk7XG4gIGF3YWl0IG5ldyBQcm9taXNlKChyKSA9PiBzdGF0ZS5tYXAub25jZShcImxvYWRcIiwgcikpO1xufVxuXG5mdW5jdGlvbiByZW5kZXJNYXJrZXJzKHN0YXRlLCBzdG9yZXMsIG9uU2VsZWN0KSB7XG4gIC8vIERpZmYgdnMuIGV4aXN0aW5nIG1hcmtlcnMgKGNoZWFwIGZvciBvdXIgc2NhbGUpXG4gIGNvbnN0IHdhbnRlZElkcyA9IG5ldyBTZXQoc3RvcmVzLm1hcCgocykgPT4gcy5pZCkpO1xuICBmb3IgKGNvbnN0IFtpZCwgbV0gb2Ygc3RhdGUubWFya2Vycykge1xuICAgIGlmICghd2FudGVkSWRzLmhhcyhpZCkpIHsgbS5yZW1vdmUoKTsgc3RhdGUubWFya2Vycy5kZWxldGUoaWQpOyB9XG4gIH1cbiAgZm9yIChjb25zdCBzIG9mIHN0b3Jlcykge1xuICAgIGlmIChzdGF0ZS5tYXJrZXJzLmhhcyhzLmlkKSkge1xuICAgICAgY29uc3QgbSA9IHN0YXRlLm1hcmtlcnMuZ2V0KHMuaWQpO1xuICAgICAgbS5nZXRFbGVtZW50KCkuY2xhc3NMaXN0LnRvZ2dsZShcImlzLWFjdGl2ZVwiLCBzdGF0ZS5hY3RpdmVJZCA9PT0gcy5pZCk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIGVsLmNsYXNzTmFtZSA9IFwibHNmLW1hcmtlclwiICsgKHN0YXRlLmFjdGl2ZUlkID09PSBzLmlkID8gXCIgaXMtYWN0aXZlXCIgOiBcIlwiKTtcbiAgICBpZiAocy5wcmVtaXVtX3BhcnRuZXIpIGVsLmNsYXNzTGlzdC5hZGQoXCJpcy1wcmVtaXVtXCIpO1xuICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyBvblNlbGVjdChzKTsgfSk7XG4gICAgY29uc3QgbWFya2VyID0gbmV3IHdpbmRvdy5tYXBib3hnbC5NYXJrZXIoZWwpLnNldExuZ0xhdChbcy5sbmcsIHMubGF0XSkuYWRkVG8oc3RhdGUubWFwKTtcbiAgICBzdGF0ZS5tYXJrZXJzLnNldChzLmlkLCBtYXJrZXIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpdE1hcFRvU3RvcmVzKHN0YXRlLCBzdG9yZXMpIHtcbiAgaWYgKCFzdG9yZXMubGVuZ3RoIHx8ICFzdGF0ZS5tYXApIHJldHVybjtcbiAgaWYgKHN0b3Jlcy5sZW5ndGggPT09IDEpIHtcbiAgICBzdGF0ZS5tYXAuZmx5VG8oeyBjZW50ZXI6IFtzdG9yZXNbMF0ubG5nLCBzdG9yZXNbMF0ubGF0XSwgem9vbTogMTMgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGJvdW5kcyA9IG5ldyB3aW5kb3cubWFwYm94Z2wuTG5nTGF0Qm91bmRzKCk7XG4gIGZvciAoY29uc3QgcyBvZiBzdG9yZXMpIGJvdW5kcy5leHRlbmQoW3MubG5nLCBzLmxhdF0pO1xuICBzdGF0ZS5tYXAuZml0Qm91bmRzKGJvdW5kcywgeyBwYWRkaW5nOiA2MCwgbWF4Wm9vbTogMTIsIGR1cmF0aW9uOiA0MDAgfSk7XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBJbml0IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXQoY29udGFpbmVyLCBvcHRpb25zID0ge30pIHtcbiAgaWYgKCFjb250YWluZXIpIHRocm93IG5ldyBFcnJvcihcIkxvb29wcyBTdG9yZWZpbmRlcjogY29udGFpbmVyIG1pc3NpbmdcIik7XG4gIGlmICghb3B0aW9ucy5kYXRhVXJsICYmICFvcHRpb25zLmRhdGEpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTG9vb3BzIFN0b3JlZmluZGVyOiBkYXRhVXJsIG9kZXIgZGF0YSBtaXNzaW5nXCIpO1xuICBpZiAoIW9wdGlvbnMubWFwYm94VG9rZW4pIHRocm93IG5ldyBFcnJvcihcIkxvb29wcyBTdG9yZWZpbmRlcjogbWFwYm94VG9rZW4gbWlzc2luZ1wiKTtcblxuICBjb25zdCBzdGF0ZSA9IGNyZWF0ZVN0YXRlKCk7XG4gIGNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKFwibHNmLXJvb3RcIik7XG4gIGNvbnRhaW5lci5pbm5lckhUTUwgPSBgPGRpdiBjbGFzcz1cImxzZi1sb2FkaW5nXCI+TGFkZSBTdG9yZXMgXHUyMDI2PC9kaXY+YDtcblxuICBsZXQgZGF0YSA9IG9wdGlvbnMuZGF0YTtcbiAgaWYgKCFkYXRhKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGZldGNoKG9wdGlvbnMuZGF0YVVybCwgeyBjYWNoZTogXCJuby1jYWNoZVwiIH0pO1xuICAgICAgaWYgKCFyZXMub2spIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlcy5zdGF0dXN9YCk7XG4gICAgICBkYXRhID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnRhaW5lci5pbm5lckhUTUwgPSBgPGRpdiBjbGFzcz1cImxzZi1lcnJvclwiPlN0b3JlcyBrb25udGVuIG5pY2h0IGdlbGFkZW4gd2VyZGVuLiAoJHtlc2NhcGVIdG1sKGVyci5tZXNzYWdlKX0pPC9kaXY+YDtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgc3RhdGUuc3RvcmVzID0gKGRhdGEuc3RvcmVzIHx8IFtdKS5maWx0ZXIoKHMpID0+IHMubGF0ICYmIHMubG5nKTtcblxuICBjb25zdCB1cGRhdGUgPSAoKSA9PiB7XG4gICAgY29uc3QgZmlsdGVyZWQgPSBmaWx0ZXJTdG9yZXMoc3RhdGUpO1xuICAgIHJlbmRlckxpc3QobGlzdEhlYWRlciwgbGlzdCwgZmlsdGVyZWQsIHN0YXRlLCBvblNlbGVjdCk7XG4gICAgcmVuZGVyTWFya2VycyhzdGF0ZSwgZmlsdGVyZWQsIG9uU2VsZWN0KTtcbiAgfTtcblxuICBjb25zdCBvblNlbGVjdCA9IChzKSA9PiB7XG4gICAgc3RhdGUuYWN0aXZlSWQgPSBzLmlkO1xuICAgIHN0YXRlLm1hcD8uZmx5VG8oeyBjZW50ZXI6IFtzLmxuZywgcy5sYXRdLCB6b29tOiAxMywgZHVyYXRpb246IDYwMCB9KTtcbiAgICB1cGRhdGUoKTtcbiAgfTtcblxuICBjb25zdCB7IGxpc3RIZWFkZXIsIGxpc3QsIG1hcEVsIH0gPSByZW5kZXJTaGVsbChjb250YWluZXIsIHN0YXRlLCB1cGRhdGUpO1xuXG4gIGF3YWl0IHNldHVwTWFwKG1hcEVsLCBzdGF0ZSwgb3B0aW9ucywgb25TZWxlY3QpO1xuICByZW5kZXJNYXJrZXJzKHN0YXRlLCBzdGF0ZS5zdG9yZXMsIG9uU2VsZWN0KTtcbiAgZml0TWFwVG9TdG9yZXMoc3RhdGUsIHN0YXRlLnN0b3Jlcyk7XG4gIHJlbmRlckxpc3QobGlzdEhlYWRlciwgbGlzdCwgc3RhdGUuc3RvcmVzLCBzdGF0ZSwgb25TZWxlY3QpO1xufVxuXG4vLyBBdXRvLWluaXQ6IDxkaXYgZGF0YS1sb29vcHMtc3RvcmVmaW5kZXIgZGF0YS1kYXRhLXVybD1cIlx1MjAyNlwiIGRhdGEtbWFwYm94LXRva2VuPVwiXHUyMDI2XCI+XG5mdW5jdGlvbiBhdXRvSW5pdCgpIHtcbiAgZm9yIChjb25zdCBlbCBvZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKFwiW2RhdGEtbG9vb3BzLXN0b3JlZmluZGVyXVwiKSkge1xuICAgIGlmIChlbC5kYXRhc2V0LmxzZkluaXRpYWxpc2VkKSBjb250aW51ZTtcbiAgICBlbC5kYXRhc2V0LmxzZkluaXRpYWxpc2VkID0gXCIxXCI7XG4gICAgaW5pdChlbCwge1xuICAgICAgZGF0YVVybDogZWwuZGF0YXNldC5kYXRhVXJsLFxuICAgICAgbWFwYm94VG9rZW46IGVsLmRhdGFzZXQubWFwYm94VG9rZW4sXG4gICAgICBkZWZhdWx0Q2VudGVyOiBlbC5kYXRhc2V0LmRlZmF1bHRDZW50ZXJcbiAgICAgICAgPyBlbC5kYXRhc2V0LmRlZmF1bHRDZW50ZXIuc3BsaXQoXCIsXCIpLm1hcChOdW1iZXIpXG4gICAgICAgIDogdW5kZWZpbmVkLFxuICAgICAgZGVmYXVsdFpvb206IGVsLmRhdGFzZXQuZGVmYXVsdFpvb20gPyBOdW1iZXIoZWwuZGF0YXNldC5kZWZhdWx0Wm9vbSkgOiB1bmRlZmluZWQsXG4gICAgICBtYXBTdHlsZTogZWwuZGF0YXNldC5tYXBTdHlsZSB8fCB1bmRlZmluZWQsXG4gICAgfSkuY2F0Y2goKGVycikgPT4gY29uc29sZS5lcnJvcihcIkxvb29wcyBTdG9yZWZpbmRlcjpcIiwgZXJyKSk7XG4gIH1cbn1cblxuaWYgKGRvY3VtZW50LnJlYWR5U3RhdGUgIT09IFwibG9hZGluZ1wiKSBhdXRvSW5pdCgpO1xuZWxzZSBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBhdXRvSW5pdCk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFnQkEsTUFBTSxhQUFhO0FBQUEsSUFDakI7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUVBLE1BQU0sYUFBYTtBQUNuQixNQUFNLFlBQVk7QUFHbEIsV0FBUyxRQUFRLE1BQU07QUFDckIsV0FBTyxJQUFJLFFBQVEsQ0FBQyxTQUFTLFdBQVc7QUFDdEMsVUFBSSxTQUFTLGNBQWMsY0FBYyxJQUFJLElBQUksRUFBRyxRQUFPLFFBQVE7QUFDbkUsWUFBTSxPQUFPLFNBQVMsY0FBYyxNQUFNO0FBQzFDLFdBQUssTUFBTTtBQUNYLFdBQUssT0FBTztBQUNaLFdBQUssU0FBUztBQUNkLFdBQUssVUFBVTtBQUNmLGVBQVMsS0FBSyxZQUFZLElBQUk7QUFBQSxJQUNoQyxDQUFDO0FBQUEsRUFDSDtBQUVBLFdBQVMsV0FBVyxLQUFLO0FBQ3ZCLFdBQU8sSUFBSSxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQ3RDLFVBQUksT0FBTyxTQUFVLFFBQU8sUUFBUTtBQUNw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
