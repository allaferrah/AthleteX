const PROD_BASE = "https://athletix-backend.onrender.com";

export function normalizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://localhost:5000")) {
    return url.replace("http://localhost:5000", PROD_BASE);
  }
  return url;
}
