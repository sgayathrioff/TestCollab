/**
 * Utility to detect file type from URL or file extension
 */

export type ReferenceType = "audio" | "video" | "document" | "image" | "link";

const EXTENSION_MAP: Record<string, ReferenceType> = {
  // Images
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  ico: "image",

  // Videos
  mp4: "video",
  webm: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
  flv: "video",
  wmv: "video",

  // Audio
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  flac: "audio",
  aac: "audio",
  m4a: "audio",
  wma: "audio",

  // Documents
  pdf: "document",
  doc: "document",
  docx: "document",
  xls: "document",
  xlsx: "document",
  ppt: "document",
  pptx: "document",
  txt: "document",
  md: "document",
  csv: "document",
  rtf: "document",
};

/**
 * Get file type from a URL or filename
 * @param url - The URL or filename to check
 * @returns The detected file type, defaults to "link" if unknown
 */
export function getFileTypeFromUrl(url: string): ReferenceType {
  try {
    // Try to extract extension from URL
    const urlObj = new URL(url, "http://placeholder.com");
    const pathname = urlObj.pathname;
    
    // Get the file extension
    const extensionMatch = pathname.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/);
    if (extensionMatch) {
      const ext = extensionMatch[1].toLowerCase();
      return EXTENSION_MAP[ext] || "link";
    }
    
    // Check for common patterns in URLs
    if (url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com")) {
      return "video";
    }
    if (url.includes("spotify.com") || url.includes("soundcloud.com")) {
      return "audio";
    }
    if (url.includes("unsplash.com") || url.includes("pexels.com") || url.includes("imgur.com")) {
      return "image";
    }
    
    return "link";
  } catch {
    return "link";
  }
}

/**
 * Get file type from a File object
 * @param file - The File object to check
 * @returns The detected file type
 */
export function getFileTypeFromMime(file: File): ReferenceType {
  const mimeType = file.type.toLowerCase();
  
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  
  // Fall back to extension check
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MAP[extension] || "document";
}
