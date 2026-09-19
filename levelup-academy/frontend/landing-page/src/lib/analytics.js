/**
 * GA4 helpers for a prerendered SPA.
 *
 * The site is a React Router SPA: after the first load, navigation swaps the view
 * without a full page reload, so GA4's automatic page_view fires only once. We set
 * `send_page_view: false` in index.html and emit every page_view manually here
 * (including the first), which keeps counts correct and paths accurate.
 *
 * All calls are guarded: during prerender (Node, no window) and before gtag has
 * loaded they no-op instead of throwing.
 */
function gtagReady() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/** One SPA page view. Call on every route change (and on first mount). */
export function trackPageView(path) {
  if (!gtagReady()) return;
  // Pin the current page onto EVERY later event, not just this page_view.
  // gtag captures page_location once, at gtag('config'), which in an SPA means
  // the first URL forever: without this, page_exit and generate_lead would all
  // be attributed to whatever page the visitor happened to land on.
  window.gtag('set', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/**
 * The page the visitor left the site from (Karis 25.08.2026).
 *
 * GA4 has no exit-rate metric — it was dropped along with Universal Analytics —
 * so "where do people drop off" is unanswerable from the built-in reports.
 * This event fills that gap: the Main Admin panel counts page_exit broken down
 * by pagePath (backend/src/modules/analytics/ga4.client.js).
 *
 * transport_type 'beacon' matters: a normal XHR fired while the tab is closing
 * gets cancelled, and the event never arrives.
 */
export function trackPageExit(path) {
  if (!gtagReady()) return;
  window.gtag('event', 'page_exit', {
    page_path: path,
    page_location: window.location.href,
    transport_type: 'beacon',
  });
}

/** Arbitrary GA4 event — used for conversions (e.g. generate_lead). */
export function trackEvent(name, params = {}) {
  if (!gtagReady()) return;
  window.gtag('event', name, params);
}
