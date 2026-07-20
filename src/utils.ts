/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats seconds into a human-readable string: "HH:MM:SS" or "MM:SS.mmm"
 */
export function formatTime(seconds: number, includeMs: boolean = false): string {
  if (isNaN(seconds) || seconds < 0) return includeMs ? "00:00.000" : "00:00";
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(3, '0');

  if (h > 0) {
    const hStr = h.toString().padStart(2, '0');
    return includeMs 
      ? `${hStr}:${mStr}:${sStr}.${msStr}` 
      : `${hStr}:${mStr}:${sStr}`;
  }

  return includeMs 
    ? `${mStr}:${sStr}.${msStr}` 
    : `${mStr}:${sStr}`;
}

/**
 * Parses YouTube Video ID from standard and short YouTube URLs
 */
export function parseYouTubeId(url: string): string | null {
  if (!url) return null;
  
  // Clean URL
  const trimmed = url.trim();
  
  // Regex patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^#\&\?]*)/,
    /^[a-zA-Z0-9_-]{11}$/ // Direct ID paste
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1] && match[1].length === 11) {
      return match[1];
    } else if (match && match[0] && match[0].length === 11 && regex.source === '^[a-zA-Z0-9_-]{11}$') {
      return match[0];
    }
  }

  // Handle queries with timestamps
  try {
    const urlObj = new URL(trimmed);
    if (urlObj.hostname.includes('youtube.com')) {
      const v = urlObj.searchParams.get('v');
      if (v && v.length === 11) return v;
    }
  } catch (e) {
    // Ignore invalid URLs
  }

  return null;
}

/**
 * Formats bytes into a human-readable size string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
