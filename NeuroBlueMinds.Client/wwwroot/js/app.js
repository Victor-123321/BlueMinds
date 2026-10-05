/**
 * BlueMinds App Initialization
 * Loads Chart.js library for dashboard charts
 */

(function() {
    // Load Chart.js from CDN if not already loaded
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.async = true;
        script.onload = function() {
            console.log('[BlueMinds] Chart.js loaded successfully');
        };
        script.onerror = function() {
            console.error('[BlueMinds] Failed to load Chart.js from CDN');
        };
        document.head.appendChild(script);
    }

    // Ensure app initialization functions are available
    window.BlueMindsApp = window.BlueMindsApp || {
        initialized: true
    };

    console.log('[BlueMinds] App initialization complete');
})();
