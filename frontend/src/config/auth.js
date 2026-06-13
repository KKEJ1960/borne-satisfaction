// P4.1 — Token migré vers cookie HttpOnly géré par le serveur.
// Le frontend n'a plus accès au JWT (inaccessible via JS = protection XSS).

export function authHeaders() {
  return {};
}

// À utiliser comme { ...ADMIN_AXIOS, headers: authHeaders() } sur les appels admin uniquement.
// Les routes publiques (/questions, /client, /avis) n'envoient pas le cookie.
export const ADMIN_AXIOS = { withCredentials: true };

// Les fonctions ci-dessous ne peuvent plus lire le cookie HttpOnly.
// Elles retournent null pour éviter de casser les imports existants.
export function parseJwtPayload() {
  return null;
}

export function getSessionRole() {
  return null;
}
