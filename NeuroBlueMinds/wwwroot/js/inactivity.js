// NeuroBlueMinds.Client/wwwroot/js/inactivity.js
// Tracks user activity and updates lastActiveAt in localStorage.
// Called once from MainLayout on mount.

(function() {
    const INACTIVITY_MS = 4 * 60 * 60 * 1000; // 4 hours
    const KEY = 'lastActiveAt';

    function touch() {
        localStorage.setItem(KEY, Date.now().toString());
    }

    function check() {
        const last = parseInt(localStorage.getItem(KEY) || '0');
        if (last && Date.now() - last > INACTIVITY_MS) {
            // Session expired — clear tokens and redirect
            localStorage.removeItem('authToken');
            localStorage.removeItem('childToken');
            localStorage.removeItem('activeChildId');
            localStorage.removeItem('activeChildName');
            window.location.href = '/select-profile';
        }
    }

    // Update on any user interaction
    ['click','keydown','touchstart','mousemove','scroll'].forEach(evt =>
        document.addEventListener(evt, touch, { passive: true })
    );

    // Check every 60 seconds
    setInterval(check, 60_000);

    // Also touch immediately on load
    touch();

    window.nbmInactivity = { touch, check };
})();
