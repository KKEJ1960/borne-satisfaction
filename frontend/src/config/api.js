import axios from "axios";
import { authHeaders, ADMIN_AXIOS } from "./auth";

const envApiUrl = import.meta.env.VITE_API_URL;

// Production  : variable d'env VITE_API_URL (Railway)
// Dev desktop : proxy Vite /api → localhost:5001 (évite le problème pare-feu Windows)
// Dev téléphone : idem, tout passe par le port 5173 déjà ouvert
export const API_URL = envApiUrl || (import.meta.env.DEV ? '/api' : `http://${window.location.hostname}:5001`);

/**
 * Config axios (headers d'auth + query param hotel_id) pour les routes
 * multi-hôtel. Utilisable pour GET/POST/PUT/DELETE — axios attache toujours
 * `params` à l'URL, donc hotel_id arrive en query string quelle que soit la
 * méthode. `extra` permet de fusionner des params/headers/options additionnels
 * (timeout, responseType…).
 */
export function apiWithHotel(hotelId, extra = {}) {
  return {
    ...ADMIN_AXIOS,
    ...extra,
    headers: { ...authHeaders(), ...(extra.headers || {}) },
    params: { hotel_id: hotelId, ...(extra.params || {}) },
  };
}

