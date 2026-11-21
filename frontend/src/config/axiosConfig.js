import axios from 'axios';

// Tells ngrok's edge to skip its "You are about to visit this domain"
// interstitial for every API request sent through a dev tunnel. Harmless on
// plain localhost; pairs with `server.allowedHosts`/`server.headers` in
// vite.config.js (which covers the first HTML document load).
const NGROK_SKIP_WARNING = { 'ngrok-skip-browser-warning': 'true' };

export default axios.create({
    baseURL: import.meta.env.VITE_BACKEND_API_URL,
    headers: NGROK_SKIP_WARNING,
});
