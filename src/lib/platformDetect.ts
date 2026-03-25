export interface PlatformInfo {
  platform: string;
  isKnownPlatform: boolean;
}

export function detectPlatform(url: string): PlatformInfo {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return { platform: "youtube", isKnownPlatform: true };
    }
    if (hostname.includes("vimeo.com")) {
      return { platform: "vimeo", isKnownPlatform: true };
    }
    if (hostname.includes("instagram.com")) {
      return { platform: "instagram", isKnownPlatform: true };
    }
    if (hostname.includes("tiktok.com")) {
      return { platform: "tiktok", isKnownPlatform: true };
    }
    if (hostname.includes("soundcloud.com")) {
      return { platform: "soundcloud", isKnownPlatform: true };
    }
    if (hostname.includes("spotify.com")) {
      return { platform: "spotify", isKnownPlatform: true };
    }
    if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
      return { platform: "x", isKnownPlatform: true };
    }
    if (hostname.includes("pinterest.com")) {
      return { platform: "pinterest", isKnownPlatform: true };
    }

    return { platform: "web", isKnownPlatform: false };
  } catch {
    return { platform: "web", isKnownPlatform: false };
  }
}
