// Single source of truth for release and browser asset cache identifiers.
// Bump ASSET_VERSION whenever a browser-delivered CSS, JS or MJS file changes.
export const ASSET_VERSION = '2.7.1';
export const PACKAGE_VERSION = '2.7.1-commercial-optimization';
export const RELEASE_FINGERPRINT = `${PACKAGE_VERSION}+assets.${ASSET_VERSION}`;

export function versionedAsset(pathname = '') {
  const value = String(pathname || '');
  if (!value) return value;
  const separator = value.includes('?') ? '&' : '?';
  return `${value}${separator}v=${encodeURIComponent(ASSET_VERSION)}`;
}
