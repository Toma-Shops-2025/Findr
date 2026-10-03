import Constants from "expo-constants";
function trimSlash(s) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim()) return trimSlash(fromEnv.trim());
  const extra = Constants.expoConfig && Constants.expoConfig.extra;
  if (extra && extra.apiUrl) return trimSlash(String(extra.apiUrl));
  return "https://api.myfindr.fun";
}
export async function apiFetch(path, options) {
  options = options || {};
  const token = options.token;
  const headers = options.headers || {};
  const rest = Object.assign({}, options);
  delete rest.token;
  delete rest.headers;
  const res = await fetch(getApiBaseUrl() + path, Object.assign({}, rest, {
    headers: Object.assign(
      { "Content-Type": "application/json" },
      token ? { Authorization: "Bearer " + token } : {},
      headers
    ),
  }));
  const data = await res.json().catch(function () { return {}; });
  if (!res.ok) {
    throw new Error(data.message || data.error || ("http_" + res.status));
  }
  return data;
}
export async function apiUploadMedia() {
  throw new Error("Media upload not available in Stage 1");
}
export async function apiUploadImage() {
  throw new Error("Media upload not available in Stage 1");
}
export async function apiListAlbum() {
  return [];
}
export async function apiDeleteAlbumItem() {}