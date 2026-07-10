import axios from "axios";

const envApiUrl = import.meta.env.VITE_API_URL;

// Production  : variable d'env VITE_API_URL (Railway)
// Dev desktop : proxy Vite /api → localhost:5001 (évite le problème pare-feu Windows)
// Dev téléphone : idem, tout passe par le port 5173 déjà ouvert
export const API_URL = envApiUrl || (import.meta.env.DEV ? '/api' : `http://${window.location.hostname}:5001`);

