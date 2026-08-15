/* TripGeo — on-device geolocation wrapper (pure logic, no DOM, no network).
 *
 * Wraps navigator.geolocation.getCurrentPosition with fixed options.
 * No watchPosition, no DOM access, no requests are made from this module.
 *
 * Privacy: the position stays on-device; it is only sent to OSRM as
 * coordinates if the user initiates a route request elsewhere in the app.
 */
(function (global) {
  "use strict";
  if (typeof global === "undefined" || global === null) return;

  const GEOLOCATION_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000
  };

  // DOMException geolocation error codes -> our coded strings.
  const CODE_MAP = { 1: "denied", 3: "timeout" };

  /**
   * Whether geolocation is usable in this context: the API exists and the
   * context is not explicitly insecure.
   * @returns {boolean}
   */
  function isSupported() {
    return !!(
      global.navigator &&
      global.navigator.geolocation &&
      global.window.isSecureContext !== false
    );
  }

  /**
   * Resolve the current position once.
   * Resolves { lat, lng, accuracy }; rejects with an Error whose `.code` is
   * "unsupported" | "denied" | "timeout" | "unavailable".
   * @returns {Promise<{lat:number, lng:number, accuracy:number}>}
   */
  function getPosition() {
    return new Promise(function (resolve, reject) {
      if (!isSupported()) {
        const err = new Error("Geolocation is not available in this context.");
        err.code = "unsupported";
        reject(err);
        return;
      }

      global.navigator.geolocation.getCurrentPosition(
        function (pos) {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        function (failure) {
          const rawCode = failure && typeof failure.code === "number" ? failure.code : -1;
          const key = CODE_MAP[rawCode] || "unavailable";
          const err = new Error(
            "Geolocation error (" + key + ")" + (failure && failure.message ? ": " + failure.message : ".")
          );
          err.code = key;
          reject(err);
        },
        GEOLOCATION_OPTIONS
      );
    });
  }

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------
  global.TripGeo = {
    isSupported: isSupported,
    getPosition: getPosition
  };
})(typeof window !== "undefined" ? window : null);
