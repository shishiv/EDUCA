/** Preserve content labels; normalize only the downloaded file's portable name. */
export function downloadFilename(filename: string): string {
  // Chromium 152 can replace a non-ASCII download attribute with "download".
  return filename.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
}
