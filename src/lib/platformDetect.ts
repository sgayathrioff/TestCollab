export interface PlatformInfo {
  platform: string;
}

export function detectPlatform(url: string): PlatformInfo {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return { platform: "youtube" };
    }
    if (hostname.includes("vimeo.com")) {
      return { platform: "vimeo" };
    }
    if (hostname.includes("instagram.com")) {
      return { platform: "instagram" };
    }
    if (hostname.includes("tiktok.com")) {
      return { platform: "tiktok" };
    }
    if (hostname.includes("soundcloud.com")) {
      return { platform: "soundcloud" };
    }
    if (hostname.includes("spotify.com")) {
      return { platform: "spotify" };
    }
    if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
      return { platform: "x" };
    }
    if (hostname.includes("pinterest.com")) {
      return { platform: "pinterest" };
    }

    return { platform: "web" };
  } catch {
    return { platform: "web" };
  }
}
