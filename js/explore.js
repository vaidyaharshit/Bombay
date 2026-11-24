// The 12 Chronicles - Explore / Mumbai Destination Discovery
// Keyless place search powered by Photon, OpenStreetMap, Wikipedia and Wikimedia Commons.
(function () {
  "use strict";

  const CONFIG = window.EXPLORE_CONFIG || {};
  const PHOTON_ENDPOINT = CONFIG.photonEndpoint || "https://photon.komoot.io/api/";
  const WIKI_SEARCH_ENDPOINT = CONFIG.wikipediaSearchEndpoint || "https://en.wikipedia.org/w/rest.php/v1/search/page";
  const WIKI_SUMMARY_ENDPOINT = CONFIG.wikipediaSummaryEndpoint || "https://en.wikipedia.org/api/rest_v1/page/summary/";
  const COMMONS_ENDPOINT = CONFIG.commonsEndpoint || "https://commons.wikimedia.org/w/api.php";
  const NOMINATIM_ENDPOINT = CONFIG.nominatimEndpoint || "https://nominatim.openstreetmap.org/lookup";
  const WIKI_GEOSEARCH_ENDPOINT = CONFIG.wikipediaGeosearchEndpoint || "https://en.wikipedia.org/w/api.php";
  const COLLECTION = CONFIG.firestoreCollection || "exploreDestinations";
  const LOCAL_KEY = "chronicles_exploreDestinations";
  const SEARCH_PLACEHOLDER = "Try Marine Drive, Gateway of India, Bandra...";
  const STATUS_YET = "Yet to Visit";
  const STATUS_VISITED = "Visited";
  const MUMBAI = CONFIG.mumbaiCenter || { lat: 19.076, lng: 72.8777 };
  const SEARCH_BBOX = CONFIG.searchBbox || { minLon: 72.4, minLat: 18.6, maxLon: 73.5, maxLat: 19.6 };
  const REQUEST_TIMEOUT = CONFIG.requestTimeoutMs || 10000;
  const NEARBY_RADIUS = CONFIG.nearbyRadiusMeters || 2500;
  const PHOTON_MIN_INTERVAL = 750;
  const NOMINATIM_MIN_INTERVAL = 1100;
  const SEARCH_DEBOUNCE = 360;
  const MAX_SUGGESTIONS = 10;
  const MAX_CACHED_SEARCHES = 40;
  const MAX_CACHED_DETAILS = 30;
  const QUERY_ALIASES = {
    iit: "indian institute of technology",
    iitb: "indian institute of technology bombay",
    csmt: "chhatrapati shivaji maharaj terminus",
    "byculla zoo": "jijamata udy",
    bse: "bombay stock exchange"
  };

  const state = {
    suggestions: [],
    activeIndex: -1,
    searchRequestId: 0,
    searchController: null,
    searchTimer: null,
    searchCache: new Map(),
    lastPhotonRequestAt: 0,
    lastNominatimRequestAt: 0,
    detailsController: null,
    detailsCache: new Map(),
    currentPlace: null,
    currentDetails: null,
    currentNearby: [],
    saved: [],
    savedReady: false,
    savedMode: "local",
    supabaseUnsubscribe: null,
    modalOpen: false,
    lastFocused: null,
    localListenersBound: false,
    addInProgress: false
  };

  const dom = {};

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return entities[character];
    });
  }

  function sanitizeUrl(value) {
    if (!value || typeof value !== "string") return "";
    try {
      const url = new URL(value, window.location.origin);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.href;
      }
    } catch (error) {
      return "";
    }
    return "";
  }

  function normalizeText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function truncate(value, maxLength) {
    const text = normalizeText(value);
    if (!text) return "";
    if (text.length <= maxLength) return text;
    const sliced = text.slice(0, maxLength);
    const lastSpace = sliced.lastIndexOf(" ");
    return `${sliced.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength).trim()}...`;
  }

  function firstSentences(value, count) {
    const text = normalizeText(value);
    if (!text) return "";
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    if (!sentences || !sentences.length) return text;
    return sentences.slice(0, count).join(" ").trim();
  }

  function stripHtml(value) {
    if (!value) return "";
    try {
      const container = document.createElement("div");
      container.innerHTML = String(value);
      return normalizeText(container.textContent || "");
    } catch (error) {
      return normalizeText(String(value).replace(/<[^>]*>/g, " "));
    }
  }

  function makeAbortError() {
    if (typeof DOMException === "function") {
      return new DOMException("Aborted", "AbortError");
    }
    const error = new Error("Aborted");
    error.name = "AbortError";
    return error;
  }

  function delay(ms, signal) {
    return new Promise((resolve, reject) => {
      let timer = null;
      const onAbort = () => {
        if (timer) clearTimeout(timer);
        reject(makeAbortError());
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }
      timer = setTimeout(() => {
        if (signal) signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
    });
  }

  async function fetchJsonOnce(url, init, timeoutMs, signal) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    try {
      const response = await fetch(url, Object.assign({}, init, { signal: controller.signal }));
      if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      if (error && error.name === "AbortError" && timedOut && !(signal && signal.aborted)) {
        const timeoutError = new Error("The request timed out.");
        timeoutError.name = "TimeoutError";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }

  async function fetchJson(url, options) {
    const settings = options || {};
    const timeoutMs = settings.timeoutMs || REQUEST_TIMEOUT;
    const retries = settings.retries || 0;
    const retryDelay = settings.retryDelay || 900;
    const retryStatuses = settings.retryStatuses || [500, 502, 503, 504];
    const signal = settings.signal;
    const init = {
      method: settings.method || "GET",
      headers: settings.headers || {},
      body: settings.body
    };
    let attempt = 0;

    while (true) {
      try {
        return await fetchJsonOnce(url, init, timeoutMs, signal);
      } catch (error) {
        if (error && error.name === "AbortError") throw error;
        const statusRetryable = error && retryStatuses.indexOf(error.status) !== -1;
        const retryable = attempt < retries && (error.name === "TimeoutError" || error.name === "TypeError" || statusRetryable);
        if (!retryable) throw error;
        attempt += 1;
        await delay(retryDelay * attempt, signal);
      }
    }
  }

  function humanizeServiceError(error) {
    if (!error) return "Something went wrong. Please try again.";
    if (error.name === "TimeoutError") {
      return "The request timed out. Check your internet connection and try again.";
    }
    if (error.status === 429) {
      return "The free place service is busy right now. Please wait a few seconds and try again.";
    }
    if (error.status >= 500) {
      return "The place service is temporarily unavailable. Please try again.";
    }
    if (error.name === "TypeError") {
      return "Could not reach the place service. Check your internet connection and try again.";
    }
    return "Could not load place information right now. Please try again.";
  }

  function formatDistance(meters) {
    const distance = Number(meters);
    if (!Number.isFinite(distance) || distance <= 0) return "";
    if (distance < 1000) return `${Math.round(distance)} m away`;
    return `${(distance / 1000).toFixed(1)} km away`;
  }

  function haversineDistance(from, to) {
    if (!from || !to) return 0;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadius = 6371000;
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);
    const deltaLat = toRadians(to.lat - from.lat);
    const deltaLng = toRadians(to.lng - from.lng);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatCoordinates(coordinates) {
    if (!coordinates) return "Information unavailable";
    return `${Number(coordinates.lat).toFixed(5)}, ${Number(coordinates.lng).toFixed(5)}`;
  }

  function formatType(value) {
    if (!value) return "Destination";
    return String(value)
      .replace(/[_/-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  function getCurrentUser() {
    try {
      if (window.authService && typeof window.authService.getCurrentUser === "function") {
        return window.authService.getCurrentUser();
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function notify(message, type) {
    if (typeof window.showToast === "function") {
      window.showToast(escapeHtml(message), type || "info");
    }
  }
  function categoryForPhoton(props) {
    const key = props.osm_key;
    const value = props.osm_value;
    if (key === "tourism") return formatType(value || "attraction");
    if (key === "historic") {
      if (value === "monument") return "Historic Monument";
      if (value === "memorial") return "Memorial";
      if (value === "ruins") return "Historic Ruins";
      return "Historic Site";
    }
    if (key === "leisure") {
      if (value === "park") return "Park";
      if (value === "garden") return "Garden";
      if (["nature_reserve", "beach_resort"].indexOf(value) !== -1) return formatType(value);
      return "Leisure Spot";
    }
    if (key === "natural") return formatType(value || "landscape");
    if (key === "amenity" && value === "place_of_worship") return "Place of Worship";
    if (key === "amenity" && (value === "university" || value === "college")) return "Educational Landmark";
    if (key === "highway") return "Road / Landmark";
    if (key === "railway") return "Railway Landmark";
    if (key === "place") return formatType(value || "locality");
    if (key === "shop") return "Shop";
    return "Destination";
  }

  function buildAddressFromPhoton(props) {
    const parts = [];
    const streetLine = [props.housenumber, props.street].filter(Boolean).join(" ");
    if (streetLine) parts.push(streetLine);
    ["locality", "district", "city", "county", "state", "postcode", "country"].forEach((field) => {
      const value = normalizeText(props[field]);
      if (value && !parts.some((part) => part.toLowerCase() === value.toLowerCase())) {
        parts.push(value);
      }
    });
    return parts.length ? parts.join(", ") : "Information unavailable";
  }

  function placeIdFor(osmType, osmId, coordinates) {
    if (osmType && osmId) return `${osmType}${osmId}`;
    if (coordinates) {
      return `P${Math.round(coordinates.lat * 100000)}${Math.round(coordinates.lng * 100000)}`;
    }
    return "";
  }

  function mapPhotonFeature(feature) {
    const props = feature && feature.properties ? feature.properties : {};
    const coordinates = feature && feature.geometry && Array.isArray(feature.geometry.coordinates)
      ? { lat: Number(feature.geometry.coordinates[1]), lng: Number(feature.geometry.coordinates[0]) }
      : null;
    if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) return null;

    const name = normalizeText(props.name);
    if (!name) return null;

    const osmType = props.osm_type ? String(props.osm_type).toUpperCase().charAt(0) : "";
    const osmId = props.osm_id ? String(props.osm_id) : "";
    const placeId = placeIdFor(osmType, osmId, coordinates);
    if (!placeId) return null;

    return {
      placeId,
      osmType,
      osmId,
      name,
      address: buildAddressFromPhoton(props),
      coordinates,
      category: categoryForPhoton(props),
      osmKey: props.osm_key || "",
      osmValue: props.osm_value || "",
      types: props.osm_key && props.osm_value ? [`${props.osm_key}:${props.osm_value}`] : [],
      distanceMeters: haversineDistance(MUMBAI, coordinates)
    };
  }

  function parseOsmId(placeId) {
    const match = /^([NWR])(\d+)$/i.exec(String(placeId || ""));
    if (!match) return { type: "", id: "" };
    return { type: match[1].toUpperCase(), id: match[2] };
  }

  function dedupePlaces(places) {
    const output = [];
    places.forEach((place) => {
      if (!place) return;
      if (output.some((existing) => existing.placeId === place.placeId)) return;
      const sameName = output.some((existing) => {
        if (!existing.coordinates || !place.coordinates) return false;
        return normalizeText(existing.name).toLowerCase() === normalizeText(place.name).toLowerCase() &&
          haversineDistance(existing.coordinates, place.coordinates) < 200;
      });
      if (sameName) return;
      output.push(place);
    });
    return output;
  }

  function typePriority(place) {
    const key = place.osmKey;
    const value = place.osmValue;
    if (key === "tourism") {
      if (["attraction", "museum", "viewpoint", "gallery", "zoo", "theme_park", "aquarium", "artwork"].indexOf(value) !== -1) return 30;
      return 18;
    }
    if (key === "historic") return 26;
    if (key === "natural") return 22;
    if (key === "leisure") {
      if (["park", "garden", "nature_reserve", "beach_resort"].indexOf(value) !== -1) return 20;
      return 8;
    }
    if (key === "amenity" && value === "place_of_worship") return 20;
    if (key === "amenity" && value === "university") return 30;
    if (key === "amenity" && ["college", "theatre", "arts_centre"].indexOf(value) !== -1) return 22;
    if (key === "highway") return 7;
    if (key === "shop") return -6;
    if (key === "place") return 6;
    return 0;
  }

  function rankSuggestions(places, query) {
    const normalizedQuery = normalizeText(query).toLowerCase().replace(/[-–—]/g, " ");
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

    return places
      .map((place) => {
        const name = normalizeText(place.name).toLowerCase().replace(/[-–—]/g, " ");
        let score = 0;
        if (name === normalizedQuery) score += 100;
        else if (name.indexOf(normalizedQuery) === 0) score += 45;
        else if (name.indexOf(normalizedQuery) !== -1) score += 35;

        const tokenHits = tokens.filter((token) => name.indexOf(token) !== -1).length;
        if (tokens.length) score += (tokenHits / tokens.length) * 25;

        Object.keys(QUERY_ALIASES).forEach((alias) => {
          if (normalizedQuery.indexOf(alias) !== -1 && name.indexOf(QUERY_ALIASES[alias]) !== -1) {
            score += 55;
          }
        });

        if (/\b(staff|chs|society|apartments?|housing|building|tower|co-?op|colony|hostel|quarters|complex|ltd|limited|pvt)\b/i.test(name)) {
          score -= 22;
        }
        if (/\b(library|department|centre|center|block|laboratory|lab|gate|grounds?|ticket(?:ing)?|counter|parking)\b/i.test(name)) {
          score -= 14;
        }
        if (/\b(disambiguation|list of)\b/i.test(name)) score -= 30;

        score += typePriority(place);
        score -= Math.min((place.distanceMeters || 0) / 1000, 40) * 0.5;
        return Object.assign({}, place, { score });
      })
      .sort((first, second) => second.score - first.score)
      .map((place) => {
        const cleaned = Object.assign({}, place);
        delete cleaned.score;
        return cleaned;
      })
      .slice(0, MAX_SUGGESTIONS);
  }

  function cacheSearch(key, places) {
    state.searchCache.set(key, places);
    if (state.searchCache.size > MAX_CACHED_SEARCHES) {
      const oldest = state.searchCache.keys().next().value;
      state.searchCache.delete(oldest);
    }
  }

  function cacheDetails(key, details) {
    state.detailsCache.set(key, details);
    if (state.detailsCache.size > MAX_CACHED_DETAILS) {
      const oldest = state.detailsCache.keys().next().value;
      state.detailsCache.delete(oldest);
    }
  }

  function isSamePlace(first, second) {
    if (!first || !second) return false;
    if (first.placeId && second.placeId && first.placeId === second.placeId) return true;
    if (normalizeText(first.name).toLowerCase() !== normalizeText(second.name).toLowerCase()) return false;
    if (!first.coordinates || !second.coordinates) return false;
    return haversineDistance(first.coordinates, second.coordinates) < 150;
  }

  function cacheDom() {
    dom.searchShell = document.getElementById("explore-search-shell");
    dom.searchInput = document.getElementById("explore-search");
    dom.searchClear = document.getElementById("explore-search-clear");
    dom.suggestions = document.getElementById("explore-suggestions");
    dom.savedGrid = document.getElementById("explore-saved-grid");
    dom.savedCount = document.getElementById("explore-saved-count");
    dom.savedSkeletons = document.getElementById("explore-saved-skeletons");
    dom.emptyState = document.getElementById("explore-empty-state");
    dom.syncStatus = document.getElementById("explore-sync-status");
    dom.modalRoot = document.getElementById("explore-modal-root");
  }

  async function init() {
    cacheDom();
    if (!dom.searchInput || !dom.savedGrid || !dom.modalRoot) return;

    if (window.authService) {
      await window.authService.ready;
    }

    dom.searchInput.disabled = false;
    dom.searchInput.placeholder = SEARCH_PLACEHOLDER;

    bindSearchEvents();
    bindSavedEvents();
    bindModalEvents();
    bindGlobalEvents();
    initDataSource();
    renderSaved();
  }

  function bindGlobalEvents() {
    document.addEventListener("click", (event) => {
      if (dom.searchShell && !dom.searchShell.contains(event.target)) {
        hideSuggestions();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.modalOpen) {
        closeModal();
      }
    });

    window.addEventListener("online", () => {
      if (dom.suggestions && !dom.suggestions.classList.contains("hidden")) {
        const query = dom.searchInput.value.trim();
        if (query.length >= 2) retrySearch();
      }
    });
  }

  function bindSearchEvents() {
    dom.searchInput.addEventListener("input", handleSearchInput);
    dom.searchInput.addEventListener("keydown", handleSearchKeydown);
    dom.searchInput.addEventListener("focus", () => {
      const query = dom.searchInput.value.trim();
      if (query.length >= 2 && state.suggestions.length) {
        renderSuggestions();
      }
    });

    if (dom.searchClear) {
      dom.searchClear.addEventListener("click", clearSearch);
    }

    if (dom.suggestions) {
      dom.suggestions.addEventListener("click", handleSuggestionClick);
      dom.suggestions.addEventListener("mouseover", (event) => {
        const option = event.target.closest('[role="option"]');
        if (!option) return;
        const index = Number(option.dataset.index);
        if (index !== state.activeIndex) setActiveSuggestion(index);
      });
    }
  }

  function bindSavedEvents() {
    dom.savedGrid.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const placeId = button.dataset.placeId;
      const destination = state.saved.find((item) => item.placeId === placeId);
      if (!destination) return;

      if (button.dataset.action === "view") {
        openDetailsModal(placeFromSaved(destination), destination);
      } else if (button.dataset.action === "toggle") {
        await toggleSavedStatus(destination);
      } else if (button.dataset.action === "remove") {
        await removeSavedDestination(destination);
      }
    });
  }

  function bindModalEvents() {
    dom.modalRoot.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-modal-close]");
      if (closeButton) {
        closeModal();
        return;
      }

      const backdrop = event.target.closest("[data-explore-modal-backdrop]");
      if (backdrop && !event.target.closest("[data-explore-modal-panel]")) {
        closeModal();
        return;
      }

      const retryButton = event.target.closest("[data-retry-details]");
      if (retryButton) {
        if (state.currentPlace) {
          state.detailsCache.delete(state.currentPlace.placeId);
          openDetailsModal(state.currentPlace);
        }
        return;
      }

      const addButton = event.target.closest("[data-add-current]");
      if (addButton) {
        handleAddCurrent();
        return;
      }

      const photoButton = event.target.closest("[data-photo-src]");
      if (photoButton) {
        updateModalPhoto(photoButton);
        return;
      }

      const nearbyButton = event.target.closest("[data-nearby-id]");
      if (nearbyButton) {
        const place = state.currentNearby.find((item) => item.placeId === nearbyButton.dataset.nearbyId);
        if (place) openDetailsModal(place);
      }
    });
  }
  function handleSearchInput() {
    updateClearButton();
    const query = dom.searchInput.value.trim();

    if (state.searchTimer) {
      clearTimeout(state.searchTimer);
      state.searchTimer = null;
    }

    if (state.searchController) {
      state.searchController.abort();
      state.searchController = null;
    }

    state.searchRequestId += 1;

    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    const requestId = state.searchRequestId;
    renderSuggestionLoading();
    state.searchTimer = setTimeout(() => {
      state.searchTimer = null;
      fetchSuggestions(query, requestId);
    }, SEARCH_DEBOUNCE);
  }

  function handleSearchKeydown(event) {
    const isOpen = dom.suggestions && !dom.suggestions.classList.contains("hidden");

    if (event.key === "ArrowDown" && isOpen && state.suggestions.length) {
      event.preventDefault();
      const nextIndex = state.activeIndex + 1 >= state.suggestions.length ? 0 : state.activeIndex + 1;
      setActiveSuggestion(nextIndex);
      return;
    }

    if (event.key === "ArrowUp" && isOpen && state.suggestions.length) {
      event.preventDefault();
      const previousIndex = state.activeIndex - 1 < 0 ? state.suggestions.length - 1 : state.activeIndex - 1;
      setActiveSuggestion(previousIndex);
      return;
    }

    if (event.key === "Enter" && isOpen && state.suggestions.length) {
      event.preventDefault();
      const index = state.activeIndex >= 0 ? state.activeIndex : 0;
      selectSuggestion(index);
      return;
    }

    if (event.key === "Escape" && isOpen) {
      hideSuggestions();
    }
  }

  function updateClearButton() {
    if (!dom.searchClear) return;
    dom.searchClear.classList.toggle("hidden", !dom.searchInput.value.trim());
  }

  function clearSearch() {
    if (state.searchController) {
      state.searchController.abort();
      state.searchController = null;
    }
    if (state.searchTimer) {
      clearTimeout(state.searchTimer);
      state.searchTimer = null;
    }
    state.searchRequestId += 1;
    state.suggestions = [];
    dom.searchInput.value = "";
    updateClearButton();
    hideSuggestions();
    dom.searchInput.focus();
  }

  async function waitForPhotonSlot(signal) {
    const elapsed = Date.now() - state.lastPhotonRequestAt;
    const wait = Math.max(0, PHOTON_MIN_INTERVAL - elapsed);
    if (wait > 0) await delay(wait, signal);
    state.lastPhotonRequestAt = Date.now();
  }

  function photonUrl(query, useBbox) {
    const params = new URLSearchParams({
      q: query,
      limit: "12",
      lang: "en",
      lat: String(MUMBAI.lat),
      lon: String(MUMBAI.lng),
      location_bias_scale: "0.5"
    });
    if (useBbox) {
      params.set("bbox", `${SEARCH_BBOX.minLon},${SEARCH_BBOX.minLat},${SEARCH_BBOX.maxLon},${SEARCH_BBOX.maxLat}`);
    }
    return `${PHOTON_ENDPOINT}?${params.toString()}`;
  }

  async function fetchPhoton(query, useBbox, signal) {
    const data = await fetchJson(photonUrl(query, useBbox), {
      signal,
      timeoutMs: 8000,
      retries: 1,
      retryDelay: 1000,
      retryStatuses: [429, 500, 502, 503, 504]
    });
    const features = data && Array.isArray(data.features) ? data.features : [];
    return dedupePlaces(features.map(mapPhotonFeature).filter(Boolean));
  }

  async function fetchSuggestions(query, requestId) {
    const cacheKey = query.toLowerCase();
    if (state.searchCache.has(cacheKey)) {
      if (requestId !== state.searchRequestId) return;
      state.suggestions = state.searchCache.get(cacheKey).slice();
      state.activeIndex = -1;
      renderSuggestions();
      return;
    }

    const controller = new AbortController();
    state.searchController = controller;

    try {
      await waitForPhotonSlot(controller.signal);
      if (requestId !== state.searchRequestId || controller.signal.aborted) return;

      let places = await fetchPhoton(query, true, controller.signal);
      if (!places.length && !/mumbai/i.test(query)) {
        await waitForPhotonSlot(controller.signal);
        if (requestId !== state.searchRequestId || controller.signal.aborted) return;
        places = await fetchPhoton(`${query} Mumbai`, false, controller.signal);
      }

      if (requestId !== state.searchRequestId || controller.signal.aborted) return;

      places = rankSuggestions(places, query);
      if (!places.length) {
        renderSuggestionEmpty(query);
        return;
      }

      cacheSearch(cacheKey, places);
      state.suggestions = places;
      state.activeIndex = -1;
      renderSuggestions();
    } catch (error) {
      if (error && error.name === "AbortError") return;
      if (requestId !== state.searchRequestId) return;
      renderSuggestionError(humanizeServiceError(error));
    } finally {
      if (state.searchController === controller) {
        state.searchController = null;
      }
    }
  }

  function renderSuggestionLoading() {
    if (!dom.suggestions) return;
    state.suggestions = [];
    state.activeIndex = -1;
    dom.suggestions.innerHTML = Array.from({ length: 3 })
      .map(() => `
        <div class="px-4 py-3.5 flex items-start gap-3 border-b border-[#A4A88A]/[0.15] last:border-0">
          <div class="explore-skeleton w-8 h-8 rounded-full shrink-0"></div>
          <div class="flex-1 space-y-2 pt-0.5">
            <div class="explore-skeleton h-3 w-2/3 rounded"></div>
            <div class="explore-skeleton h-2.5 w-1/2 rounded"></div>
          </div>
        </div>
      `)
      .join("");
    dom.suggestions.classList.remove("hidden");
    dom.searchInput.setAttribute("aria-expanded", "true");
  }

  function renderSuggestionEmpty(query) {
    if (!dom.suggestions) return;
    state.suggestions = [];
    state.activeIndex = -1;
    dom.suggestions.innerHTML = `
      <div class="px-5 py-8 text-center">
        <div class="w-10 h-10 rounded-full bg-[#F7F4EC] flex items-center justify-center mx-auto">
          <svg class="w-5 h-5 text-[#A4A88A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-4.35-4.35m1.6-5.15a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <p class="text-sm font-semibold text-[#282824] mt-3">No places found around Mumbai</p>
        <p class="text-xs text-[#282824]/[0.55] mt-1">Try a shorter name or a nearby landmark for &ldquo;${escapeHtml(query)}&rdquo;.</p>
      </div>
    `;
    dom.suggestions.classList.remove("hidden");
    dom.searchInput.setAttribute("aria-expanded", "true");
    dom.searchInput.removeAttribute("aria-activedescendant");
  }

  function renderSuggestionError(message) {
    if (!dom.suggestions) return;
    state.suggestions = [];
    state.activeIndex = -1;
    dom.suggestions.innerHTML = `
      <div class="px-5 py-6">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-[#C76B4A]/10 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-[#C76B4A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.34 3.94l-7.7 13.33A2.25 2.25 0 004.58 21h14.84a2.25 2.25 0 001.94-3.73l-7.7-13.33a2.25 2.25 0 00-3.32 0z"></path>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-[#282824]">Search unavailable</p>
            <p class="text-xs text-[#282824]/60 mt-1 leading-relaxed">${escapeHtml(message)}</p>
            <button type="button" data-retry-search class="mt-3 text-xs font-bold text-[#354B3A] hover:text-[#C76B4A]">Try again</button>
          </div>
        </div>
      </div>
    `;
    dom.suggestions.classList.remove("hidden");
    dom.searchInput.setAttribute("aria-expanded", "true");
    dom.searchInput.removeAttribute("aria-activedescendant");
  }

  function renderSuggestions() {
    if (!dom.suggestions || !state.suggestions.length) return;
    dom.suggestions.innerHTML = state.suggestions
      .map((suggestion, index) => {
        const distance = formatDistance(suggestion.distanceMeters);
        return `
          <button
            type="button"
            role="option"
            id="explore-option-${index}"
            data-index="${index}"
            aria-selected="${index === state.activeIndex}"
            class="explore-suggestion w-full px-4 py-3.5 flex items-start gap-3 text-left border-b border-[#A4A88A]/[0.15] last:border-0 transition-colors"
          >
            <span class="w-8 h-8 rounded-full bg-[#F7F4EC] flex items-center justify-center shrink-0 mt-0.5">
              <svg class="w-4 h-4 text-[#354B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-[#282824] truncate">${escapeHtml(suggestion.name || "Unknown place")}</span>
              <span class="block text-xs text-[#282824]/[0.55] truncate mt-0.5">${escapeHtml(suggestion.address || suggestion.category || "Mumbai")}</span>
            </span>
            <span class="flex flex-col items-end gap-1 shrink-0 mt-0.5">
              <span class="text-[9px] font-bold uppercase tracking-wider text-[#A4A88A]">${escapeHtml(suggestion.category || "Place")}</span>
              ${distance ? `<span class="text-[10px] text-[#A4A88A] font-semibold whitespace-nowrap">${escapeHtml(distance)}</span>` : ""}
            </span>
          </button>
        `;
      })
      .join("");
    dom.suggestions.classList.remove("hidden");
    dom.searchInput.setAttribute("aria-expanded", "true");
    if (state.activeIndex >= 0) {
      setActiveSuggestion(state.activeIndex);
    }
  }

  function setActiveSuggestion(index) {
    state.activeIndex = index;
    if (!dom.suggestions) return;
    const options = dom.suggestions.querySelectorAll('[role="option"]');
    options.forEach((option, optionIndex) => {
      option.setAttribute("aria-selected", optionIndex === index ? "true" : "false");
    });

    if (index >= 0) {
      const active = document.getElementById(`explore-option-${index}`);
      if (active) {
        dom.searchInput.setAttribute("aria-activedescendant", active.id);
        active.scrollIntoView({ block: "nearest" });
      }
    } else {
      dom.searchInput.removeAttribute("aria-activedescendant");
    }
  }

  function hideSuggestions() {
    if (!dom.suggestions) return;
    dom.suggestions.classList.add("hidden");
    dom.searchInput.setAttribute("aria-expanded", "false");
    dom.searchInput.removeAttribute("aria-activedescendant");
    state.activeIndex = -1;
  }

  function handleSuggestionClick(event) {
    const retryButton = event.target.closest("[data-retry-search]");
    if (retryButton) {
      retrySearch();
      return;
    }

    const option = event.target.closest('[role="option"]');
    if (option) {
      selectSuggestion(Number(option.dataset.index));
    }
  }

  function retrySearch() {
    const query = dom.searchInput.value.trim();
    if (query.length < 2) return;
    state.searchRequestId += 1;
    const requestId = state.searchRequestId;
    if (state.searchController) state.searchController.abort();
    renderSuggestionLoading();
    fetchSuggestions(query, requestId);
  }

  function selectSuggestion(index) {
    const suggestion = state.suggestions[index];
    if (!suggestion) return;
    dom.searchInput.value = suggestion.name || "";
    updateClearButton();
    hideSuggestions();
    state.suggestions = [];
    openDetailsModal(suggestion);
  }

  function placeFromSaved(destination) {
    if (!destination) return null;
    const parsed = parseOsmId(destination.placeId);
    const coordinates = destination.coordinates &&
      Number.isFinite(Number(destination.coordinates.lat)) &&
      Number.isFinite(Number(destination.coordinates.lng))
      ? { lat: Number(destination.coordinates.lat), lng: Number(destination.coordinates.lng) }
      : null;
    return {
      placeId: destination.placeId,
      osmType: destination.osmType || parsed.type,
      osmId: destination.osmId || parsed.id,
      name: destination.name || "Destination",
      address: destination.address || "Information unavailable",
      coordinates,
      category: destination.category || destination.primaryType || "Destination",
      types: Array.isArray(destination.types) ? destination.types : []
    };
  }
  async function openDetailsModal(place, fallbackData) {
    if (!place || !place.name) return;

    if (!state.modalOpen) {
      state.lastFocused = document.activeElement;
    }

    if (state.detailsController) {
      state.detailsController.abort();
    }
    const controller = new AbortController();
    state.detailsController = controller;

    state.currentPlace = place;
    state.currentDetails = null;
    state.currentNearby = [];
    state.modalOpen = true;
    document.body.classList.add("overflow-hidden");
    renderModalLoading(place.name);

    try {
      let details = state.detailsCache.get(place.placeId);
      if (!details) {
        const results = await Promise.allSettled([
          fetchWikipedia(place, controller.signal),
          fetchCommonsPhotos(place, controller.signal),
          fetchOsmContext(place, controller.signal)
        ]);

        if (controller.signal.aborted) return;

        const wiki = results[0].status === "fulfilled" ? results[0].value : null;
        const photos = results[1].status === "fulfilled" ? results[1].value : [];
        const osm = results[2].status === "fulfilled" ? results[2].value : { tags: {}, nearby: [] };
        const notices = [];

        if (osm && Array.isArray(osm.notices) && osm.notices.length) {
          notices.push.apply(notices, osm.notices);
        }

        if (results[0].status === "rejected" && results[0].reason && results[0].reason.name !== "AbortError") {
          notices.push("Wikipedia details could not be loaded.");
        }
        if (results[1].status === "rejected" && results[1].reason && results[1].reason.name !== "AbortError") {
          notices.push("Photographs could not be loaded.");
        }
        if (results[2].status === "rejected" && results[2].reason && results[2].reason.name !== "AbortError") {
          notices.push("OpenStreetMap details could not be loaded.");
        }

        let resolvedWiki = wiki;
        if (!resolvedWiki && osm && osm.tags && osm.tags.wikipedia) {
          const tagTitle = normalizeText(osm.tags.wikipedia).split(":").pop();
          if (tagTitle) {
            try {
              const summary = await fetchWikipediaSummary(tagTitle.replace(/\s+/g, "_"), controller.signal);
              resolvedWiki = summary ? normalizeWikiSummary(summary, tagTitle) : null;
            } catch (error) {
              if (error && error.name === "AbortError") throw error;
            }
          }
        }

        if (controller.signal.aborted) return;

        details = {
          place,
          wiki: resolvedWiki,
          photos,
          osm: osm || { tags: {}, nearby: [] },
          notices
        };
        cacheDetails(place.placeId, details);
      }

      if (controller.signal.aborted) return;

      state.currentDetails = details;
      state.currentNearby = details.osm && Array.isArray(details.osm.nearby) ? details.osm.nearby : [];
      renderDetailsModal(place, details, fallbackData);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      renderModalError(place.name, humanizeServiceError(error));
    }
  }

  async function fetchWikipedia(place, signal) {
    if (!place || !place.name) return null;
    const searchQuery = `${place.name} Mumbai`;
    const data = await fetchJson(`${WIKI_SEARCH_ENDPOINT}?q=${encodeURIComponent(searchQuery)}&limit=6`, {
      signal,
      timeoutMs: 8000,
      retries: 1,
      retryDelay: 1200,
      retryStatuses: [500, 502, 503, 504]
    });
    const pages = data && Array.isArray(data.pages) ? data.pages : [];
    const page = pickWikiPage(pages, place.name);
    if (!page) return null;

    const key = page.key || String(page.title || "").replace(/\s+/g, "_");
    if (!key) return null;
    const summary = await fetchWikipediaSummary(key, signal);
    if (!summary) return null;
    return normalizeWikiSummary(summary, page.title || key);
  }

  async function fetchWikipediaSummary(key, signal) {
    const data = await fetchJson(`${WIKI_SUMMARY_ENDPOINT}${encodeURIComponent(key)}`, {
      signal,
      timeoutMs: 8000,
      retries: 1,
      retryDelay: 1200,
      retryStatuses: [500, 502, 503, 504]
    });
    if (!data || data.type === "disambiguation" || data.type === "missing" || !data.extract) return null;
    return data;
  }

  function normalizeWikiSummary(summary, fallbackTitle) {
    const extract = normalizeText(summary.extract || "");
    if (!extract) return null;
    const contentUrl = summary.content_urls && summary.content_urls.desktop && summary.content_urls.desktop.page
      ? summary.content_urls.desktop.page
      : "";
    return {
      title: summary.title || fallbackTitle || "",
      description: normalizeText(summary.description || ""),
      extract,
      url: sanitizeUrl(contentUrl) || `https://en.wikipedia.org/wiki/${encodeURIComponent(fallbackTitle || "")}`,
      image: sanitizeUrl(summary.originalimage && summary.originalimage.source ? summary.originalimage.source : "") ||
        sanitizeUrl(summary.thumbnail && summary.thumbnail.source ? summary.thumbnail.source : ""),
      coordinates: summary.coordinates && Number.isFinite(Number(summary.coordinates.lat)) && Number.isFinite(Number(summary.coordinates.lon))
        ? { lat: Number(summary.coordinates.lat), lng: Number(summary.coordinates.lon) }
        : null
    };
  }

  function pickWikiPage(pages, placeName) {
    if (!pages.length) return null;
    const placeText = normalizeText(placeName).toLowerCase();
    const placeTokens = placeText.split(/[\s,&()/-]+/).filter((token) => token.length > 1);

    let best = null;
    let bestScore = -Infinity;

    pages.forEach((page) => {
      const title = normalizeText(page.title || "");
      if (!title) return;
      const titleText = title.toLowerCase();
      const description = normalizeText(page.description || "");
      const descriptionText = description.toLowerCase();
      const titleTokens = titleText.split(/[\s,&()/-]+/).filter(Boolean);

      let score = 0;
      if (titleText === placeText) score += 20;
      else if (titleText.indexOf(placeText) === 0 || placeText.indexOf(titleText) === 0) score += 12;
      else if (titleText.indexOf(placeText) !== -1 || placeText.indexOf(titleText) !== -1) score += 8;

      placeTokens.forEach((token) => {
        if (titleText.indexOf(token) !== -1 || titleTokens.indexOf(token) !== -1) score += 4;
        if (descriptionText.indexOf(token) !== -1) score += 2;
      });

      if (/mumbai|maharashtra|india/i.test(descriptionText)) score += 3;
      if (/disambiguation|topics referred/i.test(descriptionText) || /\(disambiguation\)/i.test(titleText)) score -= 25;
      if (!placeTokens.some((token) => titleText.indexOf(token) !== -1)) score -= 6;

      if (score > bestScore) {
        bestScore = score;
        best = page;
      }
    });

    return bestScore > 0 ? best : null;
  }
  async function fetchCommonsPhotos(place, signal) {
    const coordinates = place.coordinates;
    const tasks = [
      commonsQuery({
        generator: "search",
        gsrsearch: `${place.name} Mumbai filetype:bitmap`,
        gsrnamespace: "6",
        gsrlimit: "8"
      }, signal)
    ];

    if (coordinates) {
      tasks.push(commonsQuery({
        generator: "geosearch",
        ggscoord: `${coordinates.lat}|${coordinates.lng}`,
        ggsradius: "2000",
        ggslimit: "6",
        ggsnamespace: "6"
      }, signal));
    }

    const results = await Promise.allSettled(tasks);
    const pages = [];
    results.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        const pageValues = result.value.query && result.value.query.pages
          ? Object.values(result.value.query.pages)
          : [];
        pages.push.apply(pages, pageValues);
      }
    });

    return buildCommonsPhotos(pages);
  }

  function commonsQuery(extraParams, signal) {
    const params = new URLSearchParams(Object.assign({
      action: "query",
      format: "json",
      origin: "*",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: "1200"
    }, extraParams));

    return fetchJson(`${COMMONS_ENDPOINT}?${params.toString()}`, {
      signal,
      timeoutMs: 9000,
      retries: 1,
      retryDelay: 1000,
      retryStatuses: [500, 502, 503, 504]
    });
  }

  function buildCommonsPhotos(pages) {
    const seen = new Set();
    const photos = [];

    pages.forEach((page) => {
      if (!page || !page.imageinfo || !page.imageinfo.length) return;
      const info = page.imageinfo[0];
      const mime = info.mime || "";
      if (!/^image\/(jpeg|png|webp)$/.test(mime)) return;

      const title = page.title || "";
      if (/\b(map|logo|icon|diagram|coat of arms|flag|plan|chart|poster|banner)\b/i.test(title)) return;

      const url = sanitizeUrl(info.thumburl || info.url);
      if (!url) return;

      const key = title.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      photos.push({
        url,
        thumb: url,
        title,
        credit: commonsCredit(info.extmetadata),
        pageUrl: sanitizeUrl(info.descriptionurl)
      });
    });

    return photos.slice(0, 6);
  }

  function commonsCredit(metadata) {
    if (!metadata) return "Wikimedia Commons";
    const artist = stripHtml(metadata.Artist && metadata.Artist.value ? metadata.Artist.value : "") ||
      stripHtml(metadata.Credit && metadata.Credit.value ? metadata.Credit.value : "");
    const license = stripHtml(metadata.LicenseShortName && metadata.LicenseShortName.value ? metadata.LicenseShortName.value : "");
    if (artist && license) return `${truncate(artist, 60)} (${license}) / Wikimedia Commons`;
    if (artist) return `${truncate(artist, 60)} / Wikimedia Commons`;
    if (license) return `Wikimedia Commons (${license})`;
    return "Wikimedia Commons";
  }

  async function waitForNominatimSlot(signal) {
    const elapsed = Date.now() - state.lastNominatimRequestAt;
    const wait = Math.max(0, NOMINATIM_MIN_INTERVAL - elapsed);
    if (wait > 0) await delay(wait, signal);
    state.lastNominatimRequestAt = Date.now();
  }

  async function fetchNominatimTags(place, signal) {
    const parsed = parseOsmId(place.placeId);
    const type = place.osmType || parsed.type;
    const id = place.osmId || parsed.id;
    if (!type || !id) return { tags: {}, address: "" };

    await waitForNominatimSlot(signal);
    if (signal && signal.aborted) throw makeAbortError();

    const params = new URLSearchParams({
      osm_ids: `${type}${id}`,
      format: "jsonv2",
      extratags: "1",
      addressdetails: "1"
    });
    const data = await fetchJson(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
      signal,
      timeoutMs: 8000,
      retries: 1,
      retryDelay: 1500,
      retryStatuses: [500, 502, 503, 504]
    });

    const item = Array.isArray(data) ? data[0] : null;
    if (!item) return { tags: {}, address: "" };

    const tags = Object.assign({}, item.extratags || {});
    const address = item.address || {};
    const mapping = {
      "addr:housenumber": "house_number",
      "addr:street": "road",
      "addr:suburb": address.neighbourhood ? "neighbourhood" : "suburb",
      "addr:city": address.city ? "city" : address.town ? "town" : "village",
      "addr:district": address.city_district ? "city_district" : "county",
      "addr:state": "state",
      "addr:postcode": "postcode",
      "addr:country": "country"
    };
    Object.keys(mapping).forEach((tagKey) => {
      const sourceKey = mapping[tagKey];
      if (address[sourceKey]) tags[tagKey] = address[sourceKey];
    });
    if (!tags["addr:full"] && item.display_name) tags["addr:full"] = item.display_name;
    if (!tags.website && item.extratags && item.extratags["contact:website"]) {
      tags.website = item.extratags["contact:website"];
    }

    return { tags, address: item.display_name || "" };
  }

  async function fetchNearbyWikipedia(place, signal) {
    if (!place.coordinates) return [];

    const params = new URLSearchParams({
      action: "query",
      list: "geosearch",
      gscoord: `${place.coordinates.lat}|${place.coordinates.lng}`,
      gsradius: String(NEARBY_RADIUS),
      gslimit: "20",
      format: "json",
      origin: "*"
    });

    const data = await fetchJson(`${WIKI_GEOSEARCH_ENDPOINT}?${params.toString()}`, {
      signal,
      timeoutMs: 8000,
      retries: 1,
      retryDelay: 1200,
      retryStatuses: [500, 502, 503, 504]
    });

    const pages = data && data.query && Array.isArray(data.query.geosearch) ? data.query.geosearch : [];
    const currentName = normalizeText(place.name).toLowerCase();
    const nearby = [];

    pages.forEach((page) => {
      const name = normalizeText(page.title);
      if (!name) return;
      const lowerName = name.toLowerCase();
      if (lowerName === currentName) return;
      if (/\b(attacks?|bombing|massacre|riot|earthquake|flood|pandemic|covid|election|timeline|list of|history of)\b/i.test(name)) return;
      if (/\(disambiguation\)/i.test(name)) return;

      const lat = Number(page.lat);
      const lng = Number(page.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const coordinates = { lat, lng };
      const distanceMeters = Number(page.dist) || haversineDistance(place.coordinates, coordinates);
      if (distanceMeters < 60) return;

      nearby.push({
        placeId: placeIdFor("", "", coordinates),
        osmType: "",
        osmId: "",
        name,
        address: `Near ${place.name}`,
        coordinates,
        category: "Nearby Attraction",
        types: [],
        distanceMeters
      });
    });

    nearby.sort((first, second) => first.distanceMeters - second.distanceMeters);
    return dedupePlaces(nearby).slice(0, 6);
  }

  async function fetchOsmContext(place, signal) {
    const parsed = parseOsmId(place.placeId);
    const hasOsmId = Boolean((place.osmType || parsed.type) && (place.osmId || parsed.id));
    const notices = [];

    const results = await Promise.allSettled([
      hasOsmId ? fetchNominatimTags(place, signal) : Promise.resolve({ tags: {}, address: "" }),
      fetchNearbyWikipedia(place, signal)
    ]);

    if (signal && signal.aborted) throw makeAbortError();

    let tags = {};
    if (results[0].status === "fulfilled" && results[0].value) {
      tags = results[0].value.tags || {};
    } else if (results[0].status === "rejected" && results[0].reason && results[0].reason.name !== "AbortError") {
      notices.push("OpenStreetMap visitor details could not be loaded.");
    }

    let nearby = [];
    if (results[1].status === "fulfilled" && Array.isArray(results[1].value)) {
      nearby = results[1].value;
    } else if (results[1].status === "rejected" && results[1].reason && results[1].reason.name !== "AbortError") {
      notices.push("Nearby attractions could not be loaded.");
    }

    return { tags, nearby, notices };
  }
  function modalShell(content, label) {
    return `
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#1E241F]/[0.65] backdrop-blur-sm p-0 sm:p-4 explore-modal-backdrop" data-explore-modal-backdrop>
        <div
          class="relative w-full sm:max-w-5xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#F7F4EC] shadow-2xl animate-fade-in explore-modal-panel explore-scrollbar"
          data-explore-modal-panel
          role="dialog"
          aria-modal="true"
          aria-label="${escapeHtml(label || "Destination details")}"
        >
          ${content}
        </div>
      </div>
    `;
  }

  function renderModalLoading(name) {
    if (!dom.modalRoot) return;
    dom.modalRoot.innerHTML = modalShell(`
      <div class="relative">
        <div class="h-56 sm:h-72 bg-[#354B3A]/10 overflow-hidden">
          <div class="explore-skeleton w-full h-full"></div>
        </div>
        <button type="button" data-modal-close class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-[#282824] hover:bg-white shadow-lg flex items-center justify-center" aria-label="Close details">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-6 sm:p-8">
        <div class="explore-skeleton h-3 w-24 rounded"></div>
        <div class="explore-skeleton h-8 w-2/3 rounded mt-4"></div>
        <div class="explore-skeleton h-3 w-1/2 rounded mt-3"></div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-7">
          <div class="explore-skeleton h-24 rounded-2xl"></div>
          <div class="explore-skeleton h-24 rounded-2xl"></div>
          <div class="explore-skeleton h-24 rounded-2xl"></div>
        </div>
        <div class="space-y-3 mt-8">
          <div class="explore-skeleton h-3 w-full rounded"></div>
          <div class="explore-skeleton h-3 w-11/12 rounded"></div>
          <div class="explore-skeleton h-3 w-4/5 rounded"></div>
        </div>
        <p class="text-xs text-[#282824]/[0.45] mt-6">Loading details for ${escapeHtml(name)}...</p>
      </div>
    `, name);

    requestAnimationFrame(() => {
      const closeButton = dom.modalRoot.querySelector("[data-modal-close]");
      if (closeButton) closeButton.focus();
    });
  }

  function renderModalError(name, message) {
    if (!dom.modalRoot) return;
    dom.modalRoot.innerHTML = modalShell(`
      <div class="p-6 sm:p-10 text-center">
        <div class="w-14 h-14 rounded-2xl bg-[#C76B4A]/10 flex items-center justify-center mx-auto">
          <svg class="w-7 h-7 text-[#C76B4A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v4m0 4h.01M10.34 3.94l-7.7 13.33A2.25 2.25 0 004.58 21h14.84a2.25 2.25 0 001.94-3.73l-7.7-13.33a2.25 2.25 0 00-3.32 0z"></path>
          </svg>
        </div>
        <h3 class="font-serif text-2xl font-bold text-[#282824] mt-4">Could not load ${escapeHtml(name)}</h3>
        <p class="text-sm text-[#282824]/[0.65] mt-2 max-w-lg mx-auto leading-relaxed">${escapeHtml(message)}</p>
        <p class="text-xs text-[#282824]/[0.45] mt-4 max-w-lg mx-auto leading-relaxed">
          The Explore search uses free public services, so occasional temporary failures can happen. Your search bar is still ready to use.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <button type="button" data-retry-details class="px-5 py-2.5 rounded-xl bg-[#354B3A] text-white text-xs font-bold hover:bg-[#243428] transition-colors">Try again</button>
          <button type="button" data-modal-close class="px-5 py-2.5 rounded-xl border border-[#A4A88A]/50 text-[#282824] text-xs font-bold hover:bg-white transition-colors">Close</button>
        </div>
      </div>
    `, `Could not load ${name}`);

    requestAnimationFrame(() => {
      const closeButton = dom.modalRoot.querySelector("[data-modal-close]");
      if (closeButton) closeButton.focus();
    });
  }

  function openingHoursHtml(raw) {
    const text = normalizeText(raw);
    if (!text) return `<p class="text-sm text-[#282824]/50 mt-1">Information unavailable</p>`;
    const lines = text.split(/;\s*/).filter(Boolean);
    return `<ul class="space-y-1.5 mt-2">${lines.map((line) => `<li class="text-xs text-[#282824]/[0.65] leading-relaxed">${escapeHtml(line)}</li>`).join("")}</ul>`;
  }

  function formatFee(tags, fallbackValue) {
    const raw = normalizeText(tags && (tags.charge || tags.fee) ? (tags.charge || tags.fee) : fallbackValue || "");
    if (!raw || raw === "Information unavailable") return "Information unavailable";
    if (/^no$/i.test(raw)) return "No entry fee";
    if (/^yes$/i.test(raw)) return "Entry fee applies (amount not verified)";
    return raw;
  }

  function renderDetailsModal(place, details, fallbackData) {
    if (!dom.modalRoot) return;

    const wiki = details.wiki || null;
    const osm = details.osm || { tags: {}, nearby: [] };
    const tags = osm.tags || {};
    const nearby = Array.isArray(osm.nearby) ? osm.nearby : [];
    const notices = Array.isArray(details.notices) ? details.notices.slice() : [];

    const photos = [];
    if (Array.isArray(details.photos)) {
      details.photos.forEach((photo) => {
        if (photo && photo.url) photos.push(photo);
      });
    }
    if (!photos.length && fallbackData) {
      if (Array.isArray(fallbackData.photos)) {
        fallbackData.photos.forEach((photo) => {
          if (photo && photo.url) photos.push(photo);
        });
      }
      if (!photos.length && fallbackData.photoUrl) {
        photos.push({ url: fallbackData.photoUrl, thumb: fallbackData.photoUrl, credit: "Saved photo" });
      }
    }

    const wikiImage = wiki && wiki.image ? wiki.image : "";
    const heroPhoto = photos.length ? photos[0].url : wikiImage;
    const address = place.address && place.address !== "Information unavailable"
      ? place.address
      : tags["addr:full"] ||
        (fallbackData && fallbackData.address ? fallbackData.address : "Information unavailable");
    const coordinates = place.coordinates ||
      (fallbackData && fallbackData.coordinates ? { lat: fallbackData.coordinates.lat, lng: fallbackData.coordinates.lng } : null);
    const coordText = formatCoordinates(coordinates);
    const category = place.category || (fallbackData && fallbackData.category) || "Destination";

    const overview = firstSentences(wiki && wiki.extract ? wiki.extract : "", 2) ||
      normalizeText(tags.description || tags["description:en"]) ||
      (fallbackData && fallbackData.description && fallbackData.description !== "Information unavailable" ? fallbackData.description : "") ||
      "Information unavailable";
    const history = wiki && wiki.extract ? wiki.extract : "Information unavailable";

    const hoursText = normalizeText(tags.opening_hours || (fallbackData && fallbackData.openingHours) || "");
    const feeText = formatFee(tags, fallbackData && fallbackData.entryFee);
    const visitorTips = normalizeText(tags.description || tags["description:en"]) ||
      (fallbackData && fallbackData.visitorTips && fallbackData.visitorTips !== "Information unavailable" ? fallbackData.visitorTips : "") ||
      "Information unavailable";
    const accessibility = normalizeText(tags.wheelchair || (fallbackData && fallbackData.accessibility) || "") || "Information unavailable";
    const phone = normalizeText(tags.phone || tags["contact:phone"] || (fallbackData && fallbackData.phone) || "");
    const websiteUrl = sanitizeUrl(tags.website || tags["contact:website"] || (fallbackData && fallbackData.website) || "");
    const wikipediaUrl = wiki && wiki.url ? wiki.url : (fallbackData && fallbackData.wikipediaUrl ? fallbackData.wikipediaUrl : "");

    const mapsUrl = coordinates
      ? `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=17/${coordinates.lat}/${coordinates.lng}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(place.name)}`;

    const saved = state.saved.some((destination) => isSamePlace(destination, place));
    const photoCredit = photos.length
      ? photos[0].credit || "Photo from Wikimedia Commons"
      : wikiImage
        ? "Image from Wikipedia"
        : "";

    const hoursHtml = openingHoursHtml(hoursText);

    const nearbyHtml = nearby.length
      ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${nearby.map((nearbyPlace) => {
          const distance = nearbyPlace.distanceMeters || 0;
          return `
            <button
              type="button"
              data-nearby-id="${escapeHtml(nearbyPlace.placeId)}"
              class="group flex items-center gap-3 rounded-2xl border border-[#A4A88A]/25 bg-white p-3 text-left hover:border-[#354B3A]/40 hover:shadow-sm transition-all"
            >
              <span class="w-14 h-14 rounded-xl bg-[#354B3A]/10 shrink-0 flex items-center justify-center text-[#354B3A]/50">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-bold text-[#282824] truncate">${escapeHtml(nearbyPlace.name)}</span>
                <span class="block text-[11px] text-[#282824]/50 truncate mt-0.5">${escapeHtml(nearbyPlace.category || "Attraction")}</span>
                <span class="block text-[10px] font-semibold text-[#C76B4A] mt-1">${distance ? escapeHtml(formatDistance(distance)) : "Nearby attraction"}</span>
              </span>
            </button>
          `;
        }).join("")}</div>`
      : `<p class="text-sm text-[#282824]/50">Information unavailable</p>`;

    const thumbnailsHtml = photos.length > 1
      ? `<div class="flex gap-2 overflow-x-auto pb-1 explore-scrollbar">${photos.map((photo, index) => `
          <button
            type="button"
            data-photo-src="${escapeHtml(photo.url)}"
            class="explore-photo-thumb ${index === 0 ? "ring-2 ring-[#C76B4A]" : "ring-1 ring-transparent"} relative w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-[#354B3A]/10"
            aria-label="View photo ${index + 1}"
          >
            <img src="${escapeHtml(photo.thumb || photo.url)}" alt="" loading="lazy" class="w-full h-full object-cover" />
          </button>
        `).join("")}</div>`
      : "";

    const noticesHtml = notices.length
      ? `<div class="rounded-2xl border border-[#C76B4A]/25 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <p class="text-xs text-[#282824]/[0.65] leading-relaxed flex-1">${escapeHtml(notices.join(" "))} Some details may be missing below.</p>
          <button type="button" data-retry-details class="text-xs font-bold text-[#354B3A] hover:text-[#C76B4A] shrink-0">Retry</button>
        </div>`
      : "";

    const addButton = saved
      ? `<button type="button" disabled class="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#A4A88A] text-white text-sm font-bold cursor-not-allowed">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7"></path></svg>
          Already in Our Explore List
        </button>`
      : `<button type="button" data-add-current class="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[#354B3A] text-white text-sm font-bold hover:bg-[#243428] transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 4v16m8-8H4"></path></svg>
          Add to Our Explore List
        </button>`;

    dom.modalRoot.innerHTML = modalShell(`
      <div class="relative bg-[#354B3A]">
        <div class="relative h-60 sm:h-80 overflow-hidden">
          ${heroPhoto ? `<img id="explore-modal-hero-photo" src="${escapeHtml(heroPhoto)}" alt="${escapeHtml(place.name)}" class="absolute inset-0 w-full h-full object-cover" onerror="this.classList.add('hidden'); var fallbackNode = document.getElementById('explore-modal-hero-fallback'); if (fallbackNode) fallbackNode.classList.remove('hidden');" />` : ""}
          <div class="absolute inset-0 bg-gradient-to-t from-[#1E241F]/90 via-[#1E241F]/[0.35] to-[#1E241F]/10"></div>
          <div id="explore-modal-hero-fallback" class="${heroPhoto ? "hidden" : ""} absolute inset-0 flex items-center justify-center text-white/30">
            <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>

          <div class="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
            <span class="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-white/90 text-[#282824] backdrop-blur-sm shadow-sm">
              ${escapeHtml(category)}
            </span>
            <button type="button" data-modal-close class="w-10 h-10 rounded-full bg-white/90 text-[#282824] hover:bg-white shadow-lg flex items-center justify-center shrink-0" aria-label="Close details">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div class="absolute left-0 right-0 bottom-0 p-5 sm:p-8">
            <div class="flex flex-wrap items-center gap-2 mb-3">
              <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold bg-white/90 border-[#354B3A]/[0.15] text-[#354B3A]">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                OpenStreetMap place
              </span>
              ${photoCredit ? `<span class="text-[10px] text-white/60">${escapeHtml(photoCredit)}</span>` : ""}
            </div>
            <h2 class="font-serif text-3xl sm:text-5xl font-bold text-white leading-tight">${escapeHtml(place.name)}</h2>
            <p class="text-xs sm:text-sm text-white/75 mt-2 flex items-start gap-1.5 max-w-3xl">
              <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span>${escapeHtml(address)}</span>
            </p>
          </div>
        </div>
      </div>

      <div class="p-5 sm:p-8 space-y-8">
        ${noticesHtml}

        <div class="flex flex-col sm:flex-row gap-3">
          ${addButton}
          <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#A4A88A]/50 bg-white text-[#282824] text-sm font-bold hover:border-[#354B3A] transition-colors">
            <svg class="w-4 h-4 text-[#354B3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 20l-5.447-2.724A1 1 0 013 16.382V6.618a1 1 0 01.553-.894L9 3m0 17l6-3m-6 3V3m6 14l5.447 2.724A1 1 0 0021 18.382V8.618a1 1 0 00-.553-.894L15 5m0 12V5m0 0L9 3"></path></svg>
            Open in OpenStreetMap
          </a>
          ${wikipediaUrl ? `<a href="${escapeHtml(wikipediaUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#A4A88A]/50 bg-white text-[#282824] text-sm font-bold hover:border-[#354B3A] transition-colors">Wikipedia</a>` : ""}
          ${websiteUrl ? `<a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-[#A4A88A]/50 bg-white text-[#282824] text-sm font-bold hover:border-[#354B3A] transition-colors">Website</a>` : ""}
        </div>

        ${thumbnailsHtml ? `<div>${thumbnailsHtml}</div>` : ""}

        <section>
          <h3 class="font-serif text-xl font-bold text-[#282824]">About this place</h3>
          <p class="text-sm text-[#282824]/75 leading-relaxed mt-2">${escapeHtml(overview)}</p>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section class="lg:col-span-2">
            <h3 class="font-serif text-xl font-bold text-[#282824]">History &amp; significance</h3>
            <p class="text-sm text-[#282824]/70 leading-relaxed mt-2">${escapeHtml(history)}</p>
            ${wikipediaUrl ? `<a href="${escapeHtml(wikipediaUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs font-bold text-[#354B3A] hover:text-[#C76B4A] mt-3">Read on Wikipedia <span aria-hidden="true">&rarr;</span></a>` : ""}
          </section>

          <section class="rounded-2xl border border-[#A4A88A]/30 bg-white p-4">
            <h3 class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A4A88A]">Practical information</h3>
            <div class="mt-4 space-y-4">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Address</p>
                <p class="text-xs text-[#282824]/70 mt-1 leading-relaxed">${escapeHtml(address)}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Latitude &amp; longitude</p>
                <p class="text-xs text-[#282824]/70 mt-1 leading-relaxed">${escapeHtml(coordText)}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Opening hours</p>
                ${hoursHtml}
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Entry fee</p>
                <p class="text-xs text-[#282824]/70 mt-1 leading-relaxed">${escapeHtml(feeText)}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Best time to visit</p>
                <p class="text-sm text-[#282824]/50 mt-1">Information unavailable</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Visitor information</p>
                <p class="text-xs text-[#282824]/70 mt-1 leading-relaxed">${escapeHtml(visitorTips)}</p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Accessibility</p>
                <p class="text-xs text-[#282824]/70 mt-1 leading-relaxed">${escapeHtml(accessibility)}</p>
              </div>
              ${phone ? `<div><p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Phone</p><a href="tel:${escapeHtml(phone.replace(/\s+/g, ""))}" class="text-xs font-semibold text-[#354B3A] hover:text-[#C76B4A] mt-1 inline-block">${escapeHtml(phone)}</a></div>` : ""}
              ${websiteUrl ? `<div><p class="text-[10px] font-bold uppercase tracking-wider text-[#354B3A]">Website</p><a href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs font-semibold text-[#354B3A] hover:text-[#C76B4A] mt-1 inline-block break-all">${escapeHtml(websiteUrl.replace(/^https?:\/\//, ""))}</a></div>` : ""}
            </div>
          </section>
        </div>

        <section>
          <h3 class="font-serif text-xl font-bold text-[#282824]">Nearby attractions</h3>
          <p class="text-xs text-[#282824]/50 mt-1">Wikipedia geosearch results within roughly ${(NEARBY_RADIUS / 1000).toFixed(1)} km.</p>
          <div class="mt-4">${nearbyHtml}</div>
        </section>

        <p class="text-[10px] text-[#282824]/40 leading-relaxed border-t border-[#A4A88A]/25 pt-4">
          Place data &copy; OpenStreetMap contributors. Descriptions from Wikipedia. Photographs from Wikimedia Commons. Details may be incomplete or change; verify timings and entry requirements before visiting.
        </p>
      </div>
    `, place.name);

    requestAnimationFrame(() => {
      const closeButton = dom.modalRoot.querySelector("[data-modal-close]");
      if (closeButton) closeButton.focus();
    });
  }

  function updateModalPhoto(button) {
    const source = button.dataset.photoSrc;
    if (!source) return;
    const hero = dom.modalRoot.querySelector("#explore-modal-hero-photo");
    if (hero) {
      hero.src = source;
      hero.classList.remove("hidden");
    }
    dom.modalRoot.querySelectorAll(".explore-photo-thumb").forEach((thumb) => {
      thumb.classList.remove("ring-2", "ring-[#C76B4A]");
      thumb.classList.add("ring-1", "ring-transparent");
    });
    button.classList.remove("ring-1", "ring-transparent");
    button.classList.add("ring-2", "ring-[#C76B4A]");
  }

  function closeModal() {
    if (!state.modalOpen) return;
    state.modalOpen = false;
    if (state.detailsController) {
      state.detailsController.abort();
      state.detailsController = null;
    }
    dom.modalRoot.innerHTML = "";
    document.body.classList.remove("overflow-hidden");
    const previousFocus = state.lastFocused;
    state.lastFocused = null;
    if (previousFocus && typeof previousFocus.focus === "function") {
      setTimeout(() => previousFocus.focus(), 0);
    }
  }
  function buildSavedDestination(place, details, overview) {
    const user = getCurrentUser();
    const wiki = details.wiki || null;
    const osm = details.osm || { tags: {} };
    const tags = osm.tags || {};
    const photos = Array.isArray(details.photos) ? details.photos.slice(0, 6) : [];
    const coordinates = place.coordinates &&
      Number.isFinite(Number(place.coordinates.lat)) &&
      Number.isFinite(Number(place.coordinates.lng))
      ? { lat: Number(place.coordinates.lat), lng: Number(place.coordinates.lng) }
      : null;
    const parsed = parseOsmId(place.placeId);
    const osmUrl = coordinates
      ? `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lng}#map=17/${coordinates.lat}/${coordinates.lng}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(place.name)}`;

    return {
      placeId: place.placeId,
      osmType: place.osmType || parsed.type,
      osmId: place.osmId || parsed.id,
      name: place.name,
      description: overview === "Information unavailable" ? "Information unavailable" : truncate(overview, 260),
      address: place.address && place.address !== "Information unavailable"
        ? place.address
        : normalizeText(tags["addr:full"]) || "Information unavailable",
      coordinates,
      category: place.category || "Destination",
      types: Array.isArray(place.types) ? place.types : [],
      primaryType: place.category || "",
      photos,
      photoUrl: photos.length ? photos[0].url : wiki && wiki.image ? wiki.image : "",
      wikipediaUrl: wiki && wiki.url ? wiki.url : "",
      osmUrl,
      website: sanitizeUrl(tags.website || tags["contact:website"] || ""),
      phone: normalizeText(tags.phone || tags["contact:phone"] || ""),
      openingHours: normalizeText(tags.opening_hours || ""),
      entryFee: formatFee(tags),
      bestTime: "Information unavailable",
      visitorTips: normalizeText(tags.description || tags["description:en"] || "") || "Information unavailable",
      accessibility: normalizeText(tags.wheelchair || "") || "Information unavailable",
      status: STATUS_YET,
      visited: false,
      addedById: user && user.id ? user.id : "local-user",
      addedByName: user && user.name ? user.name : "A squad member",
      addedAt: new Date().toISOString()
    };
  }

  async function handleAddCurrent() {
    if (!state.currentDetails || state.addInProgress) return;
    const button = dom.modalRoot.querySelector("[data-add-current]");
    state.addInProgress = true;
    if (button) {
      button.disabled = true;
      button.classList.add("opacity-70", "cursor-wait");
    }

    try {
      const details = state.currentDetails;
      const wiki = details.wiki;
      const osm = details.osm || { tags: {} };
      const overview = firstSentences(wiki && wiki.extract ? wiki.extract : "", 2) ||
        normalizeText(osm.tags && (osm.tags.description || osm.tags["description:en"])) ||
        "Information unavailable";
      const destination = buildSavedDestination(state.currentPlace, details, overview);
      const result = await dataAdd(destination);

      if (result.exists) {
        notify("This destination is already in Our Explore List.", "info");
      } else {
        const localSuffix = state.savedMode === "local" ? " Saved locally for now." : "";
        notify(`${destination.name} added to Our Explore List.${localSuffix}`, "success");
      }
      markAddButtonComplete();
    } catch (error) {
      console.warn("Could not add destination:", error);
      notify(friendlyFirestoreError(error), "error");
      if (button) {
        button.disabled = false;
        button.classList.remove("opacity-70", "cursor-wait");
      }
    } finally {
      state.addInProgress = false;
    }
  }

  function markAddButtonComplete() {
    const button = dom.modalRoot.querySelector("[data-add-current]");
    if (!button) return;
    button.disabled = true;
    button.classList.remove("bg-[#354B3A]", "hover:bg-[#243428]", "opacity-70", "cursor-wait");
    button.classList.add("bg-[#A4A88A]", "cursor-not-allowed");
    button.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7"></path></svg>
      Added to Our Explore List
    `;
  }

  function friendlyFirestoreError(error) {
    const code = error && error.code ? String(error.code) : "";
    if (code.indexOf("permission-denied") !== -1) {
      return "Firestore rules blocked this write. Allow signed-in squad members to write to the Explore List.";
    }
    if (code.indexOf("unavailable") !== -1) {
      return "Firestore is unreachable right now. Please try again.";
    }
    if (code.indexOf("failed-precondition") !== -1) {
      return "Firestore needs an index for this list. Check the browser console for the setup link.";
    }
    return "Could not save to the shared Explore List. Please try again.";
  }

  function initDataSource() {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.chroniclesData) {
      state.savedMode = "initializing";
      renderSavedSkeleton();
      renderSyncStatus();
      initializeSupabase();
      return;
    }

    state.savedMode = "local";
    loadLocalSaved();
    renderSyncStatus();
  }

  function initializeSupabase() {
    try {
      if (state.supabaseUnsubscribe) {
        state.supabaseUnsubscribe();
        state.supabaseUnsubscribe = null;
      }
      const unsubscribe = window.chroniclesData.subscribeDestinations((destinations) => {
        state.saved = destinations.map((d) => Object.assign({}, d, { placeId: d.placeId || d.id }));
        state.savedReady = true;
        state.savedMode = "supabase";
        renderSaved();
        renderSyncStatus();
      });
      state.supabaseUnsubscribe = unsubscribe;
      state.savedReady = true;
      state.savedMode = "supabase";
      renderSyncStatus();
    } catch (err) {
      console.warn("Supabase destinations subscription error:", err);
      state.savedMode = "local";
      loadLocalSaved();
      renderSyncStatus();
    }
  }

  function loadLocalSaved() {
    state.saved = localRead();
    state.savedReady = true;
    bindLocalListeners();
    renderSaved();
  }

  function bindLocalListeners() {
    if (state.localListenersBound) return;
    state.localListenersBound = true;

    window.addEventListener("chronicles:exploreListUpdated", () => {
      if (state.savedMode !== "local") return;
      state.saved = localRead();
      renderSaved();
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== LOCAL_KEY || state.savedMode !== "local") return;
      state.saved = localRead();
      renderSaved();
    });
  }

  function localRead() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => item && item.placeId) : [];
    } catch (error) {
      console.warn("Could not read local Explore List:", error);
      return [];
    }
  }

  function localWrite(list) {
    const sorted = list.slice().sort((a, b) => {
      const first = new Date(a.addedAt || 0).getTime();
      const second = new Date(b.addedAt || 0).getTime();
      return second - first;
    });

    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(sorted));
    } catch (error) {
      console.warn("Could not write local Explore List:", error);
      notify("Browser storage is unavailable. The Explore List could not be saved locally.", "error");
    }

    window.dispatchEvent(new CustomEvent("chronicles:exploreListUpdated"));
  }

  function isDuplicateDestination(destination, list) {
    const items = Array.isArray(list) ? list : [];
    return items.some((item) => isSamePlace(item, destination));
  }

  async function dataAdd(destination) {
    if (isDuplicateDestination(destination, state.saved)) {
      return { exists: true };
    }

    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.chroniclesData) {
      try {
        const res = await window.chroniclesData.addDestination(destination);
        if (res && res.exists) return { exists: true };
        return { exists: false };
      } catch (err) {
        console.warn("Could not add destination to Supabase:", err);
      }
    }

    const list = localRead();
    if (isDuplicateDestination(destination, list)) {
      return { exists: true };
    }
    list.unshift(destination);
    localWrite(list);
    return { exists: false };
  }

  async function dataUpdateStatus(placeId, status) {
    const visited = status === STATUS_VISITED;
    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.chroniclesData) {
      try {
        await window.chroniclesData.toggleDestinationVisited(placeId);
        return;
      } catch (err) {
        console.warn("Could not update destination status in Supabase:", err);
      }
    }

    const list = localRead();
    const destination = list.find((item) => item.placeId === placeId);
    if (!destination) return;
    destination.status = status;
    destination.visited = visited;
    destination.updatedAt = new Date().toISOString();
    localWrite(list);
  }

  async function dataRemove(placeId) {
    if (window.isSupabaseConfigured && window.isSupabaseConfigured() && window.chroniclesData) {
      try {
        await window.chroniclesData.deleteDestination(placeId);
        return;
      } catch (err) {
        console.warn("Could not delete destination from Supabase:", err);
      }
    }

    const list = localRead().filter((item) => item.placeId !== placeId);
    localWrite(list);
  }

  async function toggleSavedStatus(destination) {
    const nextStatus = isVisited(destination) ? STATUS_YET : STATUS_VISITED;
    try {
      await dataUpdateStatus(destination.placeId, nextStatus);
      notify(`${destination.name} marked as ${nextStatus}.`, "success");
    } catch (error) {
      console.warn("Could not update destination status:", error);
      notify(friendlyFirestoreError(error), "error");
    }
  }

  async function removeSavedDestination(destination) {
    const confirmed = window.confirm(`Remove "${destination.name}" from Our Explore List?`);
    if (!confirmed) return;
    try {
      await dataRemove(destination.placeId);
      notify(`${destination.name} removed from Our Explore List.`, "info");
    } catch (error) {
      console.warn("Could not remove destination:", error);
      notify(friendlyFirestoreError(error), "error");
    }
  }
  function isVisited(destination) {
    return destination.status === STATUS_VISITED || destination.visited === true;
  }

  function renderSavedSkeleton() {
    if (!dom.savedSkeletons || !dom.savedGrid || !dom.emptyState) return;
    dom.emptyState.classList.add("hidden");
    dom.savedGrid.classList.add("hidden");
    dom.savedGrid.innerHTML = "";
    dom.savedSkeletons.classList.remove("hidden");
    dom.savedSkeletons.innerHTML = Array.from({ length: 3 })
      .map(() => `
        <div class="rounded-2xl border border-[#A4A88A]/25 bg-white overflow-hidden">
          <div class="explore-skeleton h-52"></div>
          <div class="p-5 space-y-3">
            <div class="explore-skeleton h-3 w-20 rounded"></div>
            <div class="explore-skeleton h-5 w-3/4 rounded"></div>
            <div class="explore-skeleton h-3 w-full rounded"></div>
            <div class="explore-skeleton h-3 w-5/6 rounded"></div>
            <div class="explore-skeleton h-10 w-full rounded-xl mt-5"></div>
          </div>
        </div>
      `)
      .join("");
  }

  function renderSaved() {
    if (!dom.savedGrid || !dom.savedCount || !dom.emptyState) return;
    const items = state.saved || [];
    dom.savedCount.textContent = String(items.length);

    if (!state.savedReady) {
      renderSavedSkeleton();
      return;
    }

    if (dom.savedSkeletons) {
      dom.savedSkeletons.classList.add("hidden");
      dom.savedSkeletons.innerHTML = "";
    }

    if (!items.length) {
      dom.savedGrid.classList.add("hidden");
      dom.savedGrid.innerHTML = "";
      dom.emptyState.classList.remove("hidden");
      return;
    }

    dom.emptyState.classList.add("hidden");
    dom.savedGrid.classList.remove("hidden");
    dom.savedGrid.innerHTML = items.map(renderSavedCard).join("");
  }

  function renderSavedCard(destination) {
    const visited = isVisited(destination);
    const name = destination.name || "Destination";
    const address = destination.address || "Information unavailable";
    const description = destination.description || "Information unavailable";
    const status = visited ? STATUS_VISITED : STATUS_YET;
    const addedBy = destination.addedByName ? `Added by ${destination.addedByName}` : "Added by a squad member";
    const addedOn = formatDate(destination.addedAt);
    const photo = savedPhotoUrl(destination);

    return `
      <article class="journal-card overflow-hidden flex flex-col group transition-all duration-300">
        <div class="relative h-52 overflow-hidden bg-gradient-to-br from-[#354B3A] to-[#243428]">
          ${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden')" />` : ""}
          <div class="${photo ? "hidden" : ""} absolute inset-0 flex items-center justify-center text-white/25">
            <svg class="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div class="absolute inset-x-0 top-0 p-3 flex items-start justify-between gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/90 text-[#282824] backdrop-blur-sm shadow-sm">${escapeHtml(typeLabel(destination))}</span>
          </div>
          <span class="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${visited ? "bg-[#354B3A] text-white" : "bg-white/90 text-[#282824]"} shadow-sm">
            <span class="w-1.5 h-1.5 rounded-full ${visited ? "bg-white" : "bg-[#C76B4A]"}"></span>
            ${escapeHtml(status)}
          </span>
        </div>

        <div class="p-5 flex-1 flex flex-col">
          <h3 class="font-serif text-xl font-bold text-[#282824] group-hover:text-[#354B3A] transition-colors leading-snug">${escapeHtml(name)}</h3>
          <p class="text-[11px] text-[#282824]/50 mt-1.5 flex items-start gap-1.5">
            <svg class="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#C76B4A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span class="line-clamp-2">${escapeHtml(address)}</span>
          </p>
          <p class="text-xs text-[#282824]/[0.65] leading-relaxed mt-3 line-clamp-3">${escapeHtml(description)}</p>

          <div class="mt-auto pt-4">
            <p class="text-[10px] text-[#A4A88A] font-semibold">${escapeHtml(addedBy)}${addedOn ? ` &middot; ${escapeHtml(addedOn)}` : ""}</p>
            <div class="flex items-center gap-2 mt-3">
              <button type="button" data-action="view" data-place-id="${escapeHtml(destination.placeId)}" class="flex-1 px-3 py-2 rounded-lg bg-[#354B3A] text-white text-xs font-bold hover:bg-[#243428] transition-colors">View details</button>
              <button type="button" data-action="toggle" data-place-id="${escapeHtml(destination.placeId)}" class="px-3 py-2 rounded-lg border border-[#A4A88A]/40 bg-white text-[#282824] text-xs font-bold hover:border-[#354B3A] transition-colors">${visited ? "Yet to Visit" : "Mark Visited"}</button>
              <button type="button" data-action="remove" data-place-id="${escapeHtml(destination.placeId)}" class="w-9 h-9 rounded-lg border border-[#C76B4A]/25 bg-white text-[#C76B4A] hover:bg-[#C76B4A]/10 transition-colors flex items-center justify-center shrink-0" aria-label="Remove ${escapeHtml(name)} from the Explore List">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function savedPhotoUrl(destination) {
    if (Array.isArray(destination.photos) && destination.photos.length) {
      const first = destination.photos.find((photo) => photo && (photo.url || photo.thumb));
      if (first) {
        const url = sanitizeUrl(first.url || first.thumb);
        if (url) return url;
      }
    }
    return sanitizeUrl(destination.photoUrl);
  }

  function typeLabel(destination) {
    if (destination.category) return destination.category;
    if (destination.primaryType) return formatType(destination.primaryType);
    return "Destination";
  }

  function renderSyncStatus() {
    if (!dom.syncStatus) return;

    if (state.savedMode === "initializing") {
      dom.syncStatus.innerHTML = `
        <span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#A4A88A]/[0.35] bg-white text-[11px] font-semibold text-[#282824]/60">
          <span class="w-2 h-2 rounded-full bg-[#C76B4A] animate-pulse"></span>
          Connecting to Firestore...
        </span>
      `;
      return;
    }

    if (state.savedMode === "supabase") {
      dom.syncStatus.innerHTML = `
        <span class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#354B3A]/20 bg-[#354B3A]/[0.08] text-[11px] font-semibold text-[#354B3A]">
          <span class="w-2 h-2 rounded-full bg-[#354B3A]"></span>
          ⚡ Supabase Live &middot; Shared with the squad
        </span>
      `;
      return;
    }

    const configured = window.isSupabaseConfigured && window.isSupabaseConfigured();
    dom.syncStatus.innerHTML = configured
      ? `
        <button type="button" onclick="window.location.reload()" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#C76B4A]/25 bg-[#C76B4A]/[0.08] text-[11px] font-semibold text-[#AB5636] hover:bg-[#C76B4A]/[0.12] transition-colors">
          <span class="w-2 h-2 rounded-full bg-[#C76B4A]"></span>
          Local preview &middot; Reconnect Supabase
        </button>
      `
      : `
        <button type="button" onclick="window.openSupabaseSettingsModal()" class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#C76B4A]/25 bg-[#C76B4A]/[0.08] text-[11px] font-semibold text-[#AB5636] hover:bg-[#C76B4A]/[0.12] transition-colors">
          <span class="w-2 h-2 rounded-full bg-[#C76B4A]"></span>
          ⚡ Supabase Not Connected &middot; Click to configure
        </button>
      `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }







})();
