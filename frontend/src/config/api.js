import axios from "axios";

const envApiUrl = import.meta.env.VITE_API_URL;

// Si URL définie dans .env, l'utiliser directement
// Fallback réseau: quand l'app est ouverte depuis un téléphone,
// on cible automatiquement le backend sur la même machine (port 5001).
export const API_URL = envApiUrl || `http://${window.location.hostname}:5001`;

