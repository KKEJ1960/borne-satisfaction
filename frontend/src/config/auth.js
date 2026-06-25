let _token = null;

export function setAdminToken(token) { _token = token; }
export function getAdminToken() { return _token; }
export function clearAdminToken() { _token = null; }

export function authHeaders() {
  return _token ? { Authorization: `Bearer ${_token}` } : {};
}

export const ADMIN_AXIOS = {};
