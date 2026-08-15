/* TripTheme — light/dark/auto theme controller (tiny, dependency-free).
 *
 * Plain global (window.TripTheme), loaded after data/maps/timeline/geo but
 * before app.js. Read (guarded) by js/maps.js for tile theming.
 *
 * Only DOM work performed:
 *   - sets <html data-theme="light|dark|auto">
 *   - updates <meta name="theme-color">
 *   - one matchMedia("(prefers-color-scheme: dark)") change listener
 *
 * Dispatches `themechange` (CustomEvent, detail: { effective: "light"|"dark" })
 * after any effective-scheme change so other modules can react.
 */
(function (global) {
  "use strict";

  const win = typeof global !== "undefined" && global !== null ? global : window;
  const doc = win.document;

  const STORAGE_KEY = "tasroad-theme";
  const LIGHT_COLOR = "#f7f3ea";
  const DARK_COLOR = "#18241f";
  const MODES = ["light", "dark", "auto"];

  let mode = "auto";
  let metaTheme = null;
  let darkMedia = null;

  /** Stored preference, validated; defaults to "auto" (storage may throw). */
  function readStored() {
    try {
      const v = win.localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark" || v === "auto") return v;
    } catch (err) { /* storage unavailable — fall through to default */ }
    return "auto";
  }

  /** Best-effort persist; storage failures are non-fatal. */
  function persist(v) {
    try {
      win.localStorage.setItem(STORAGE_KEY, v);
    } catch (err) { /* storage unavailable — ignore */ }
  }

  /** Whether the OS-level scheme is dark (guard against missing matchMedia). */
  function systemPrefersDark() {
    try {
      return !!win.matchMedia && win.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (err) {
      return false;
    }
  }

  /** "light" | "dark" — the scheme actually shown right now. */
  function effective() {
    if (mode === "light" || mode === "dark") return mode;
    return systemPrefersDark() ? "dark" : "light";
  }

  /**
   * Apply `m` ("light" | "dark" | "auto") to the DOM and return the effective
   * scheme. <html data-theme> keeps the raw mode; the meta theme-color always
   * reflects the effective scheme.
   */
  function apply(m) {
    mode = m;
    if (doc && doc.documentElement) {
      doc.documentElement.dataset.theme = m;
    }
    const eff = effective();
    if (metaTheme === null && doc) {
      metaTheme = doc.querySelector('meta[name="theme-color"]');
    }
    if (metaTheme) {
      metaTheme.setAttribute("content", eff === "dark" ? DARK_COLOR : LIGHT_COLOR);
    }
    return eff;
  }

  function dispatch(eff) {
    try {
      win.dispatchEvent(new win.CustomEvent("themechange", { detail: { effective: eff } }));
    } catch (err) { /* engines without CustomEvent — ignore */ }
  }

  /** matchMedia change handler: only acts while the user is in auto mode. */
  function onSystemChange() {
    if (mode !== "auto") return;
    dispatch(apply("auto"));
  }

  /**
   * Init: read the stored preference, apply it, wire the OS-scheme listener
   * (active only in auto mode), then announce the starting effective scheme.
   */
  function init() {
    const eff = apply(readStored());
    try {
      if (typeof win.matchMedia === "function") {
        darkMedia = win.matchMedia("(prefers-color-scheme: dark)");
        if (typeof darkMedia.addEventListener === "function") {
          darkMedia.addEventListener("change", onSystemChange);
        } else if (typeof darkMedia.addListener === "function") {
          darkMedia.addListener(onSystemChange); // legacy WebKit
        }
      }
    } catch (err) { /* matchMedia unavailable — auto mode stays static */ }
    dispatch(eff);
  }

  /** Cycle the preference: light → dark → auto → light. */
  function cycle() {
    const idx = MODES.indexOf(mode);
    const next = MODES[(idx + 1) % MODES.length];
    const eff = apply(next);
    persist(next);
    dispatch(eff);
  }

  win.TripTheme = {
    get mode() { return mode; },
    init: init,
    cycle: cycle,
    effective: effective
  };
})(typeof window !== "undefined" ? window : null);
