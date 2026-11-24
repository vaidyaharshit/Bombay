// The 12 Chronicles — Explore / Open Data Configuration
//
// Explore search is completely keyless. It uses free public services:
//   - Photon (OpenStreetMap-based autocomplete & search)
//   - Nominatim (OpenStreetMap place tags, visitor info & addresses)
//   - Wikipedia REST + GeoSearch APIs (descriptions, history & nearby places)
//   - Wikimedia Commons API (destination photographs)
//
// No Google Cloud account, API key, or billing setup is required.

window.EXPLORE_CONFIG = {
  photonEndpoint: "https://photon.komoot.io/api/",
  wikipediaSearchEndpoint: "https://en.wikipedia.org/w/rest.php/v1/search/page",
  wikipediaSummaryEndpoint: "https://en.wikipedia.org/api/rest_v1/page/summary/",
  commonsEndpoint: "https://commons.wikimedia.org/w/api.php",
  nominatimEndpoint: "https://nominatim.openstreetmap.org/lookup",
  wikipediaGeosearchEndpoint: "https://en.wikipedia.org/w/api.php",

  // Search is prioritised around Mumbai and the wider metropolitan region.
  mumbaiCenter: { lat: 19.076, lng: 72.8777 },
  searchBbox: { minLon: 72.4, minLat: 18.6, maxLon: 73.5, maxLat: 19.6 },

  requestTimeoutMs: 10000,
  nearbyRadiusMeters: 2500,

  // Firestore collection used by the shared Explore List.
  firestoreCollection: "exploreDestinations"
};
