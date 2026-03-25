import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ReferenceType, getFileTypeFromUrl } from "@/lib/fileType";

const STORAGE_BUCKET = "Link-UpWorkpace";

// Create a Supabase client with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
};

function sanitizeFileName(name: string) {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

function inferTypeFromContentType(contentType: string, fallback: ReferenceType): ReferenceType {
  const lower = contentType.toLowerCase();
  if (lower.startsWith("image/")) return "image";
  if (lower.startsWith("video/")) return "video";
  if (lower.startsWith("audio/")) return "audio";
  return fallback;
}

function extractMeta(html: string) {
  const getMeta = (name: string) => {
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    return html.match(regex)?.[1]?.trim() || null;
  };

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = getMeta("og:title") || getMeta("twitter:title") || titleMatch?.[1]?.trim() || null;
  const image = getMeta("og:image") || getMeta("twitter:image") || null;
  const video = getMeta("og:video") || getMeta("og:video:url") || getMeta("og:video:secure_url") || null;
  const audio = getMeta("og:audio") || getMeta("og:audio:url") || getMeta("og:audio:secure_url") || null;
  const twitterPlayer = getMeta("twitter:player") || null;
  const linkImageMatch = html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  const linkImage = linkImageMatch?.[1]?.trim() || null;

  let jsonLdContentUrl: string | null = null;
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    const block = match[1];
    const contentUrlMatch = block.match(/"contentUrl"\s*:\s*"([^"]+)"/i);
    if (contentUrlMatch?.[1]) {
      jsonLdContentUrl = contentUrlMatch[1];
      break;
    }
  }

  const description = getMeta("description") || getMeta("og:description") || null;
  return { title, image, video, audio, twitterPlayer, linkImage, jsonLdContentUrl, description };
}

function extractMediaCandidatesFromHtml(html: string): string[] {
  const candidates: string[] = [];

  const videoSrcMatches = html.matchAll(/<video[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of videoSrcMatches) {
    if (match[1]) candidates.push(match[1]);
  }

  const sourceTagMatches = html.matchAll(/<source[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of sourceTagMatches) {
    if (match[1]) candidates.push(match[1]);
  }

  const imgSrcMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of imgSrcMatches) {
    if (match[1]) candidates.push(match[1]);
  }

  const srcSetMatches = html.matchAll(/<img[^>]+srcset=["']([^"']+)["'][^>]*>/gi);
  for (const match of srcSetMatches) {
    const srcSet = match[1] || "";
    srcSet
      .split(",")
      .map((part) => part.trim().split(" ")[0])
      .filter(Boolean)
      .forEach((u) => candidates.push(u));
  }

  return candidates;
}

function extractMediaCandidatesFromUrl(rawUrl: string): string[] {
  try {
    const url = new URL(rawUrl);
    const keys = ["imgurl", "mediaurl", "url", "u"];
    return keys
      .map((key) => url.searchParams.get(key))
      .filter((value): value is string => !!value && /^https?:\/\//i.test(value));
  } catch {
    return [];
  }
}

function toAbsoluteUrl(candidate: string, baseUrl: string): string {
  try {
    return new URL(candidate).toString();
  } catch {
    return new URL(candidate, baseUrl).toString();
  }
}

async function uploadPreviewFromUrl(params: {
  supabase: ReturnType<typeof createClient>;
  imageUrl: string;
  baseType: ReferenceType;
}) {
  const { supabase, imageUrl, baseType } = params;

  const previewResponse = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!previewResponse.ok) return null;

  const previewType = previewResponse.headers.get("content-type") || "image/jpeg";
  if (!previewType.startsWith("image/")) return null;

  const previewBlob = await previewResponse.blob();
  const ext = EXT_MAP[previewType] || ".jpg";
  const previewPath = `imports/previews/${baseType}/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(previewPath, previewBlob, {
      contentType: previewType,
      upsert: false,
    });

  if (error) return null;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(previewPath);
  return data.publicUrl;
}

function inferTypeFromAssetUrl(assetUrl: string, fallback: ReferenceType): ReferenceType {
  const fromUrl = getFileTypeFromUrl(assetUrl);
  if (fromUrl === "image" || fromUrl === "video" || fromUrl === "audio" || fromUrl === "document") {
    return fromUrl;
  }
  return fallback;
}

function fallbackPreviewByType(type: ReferenceType) {
  if (type === "image") return "/window.svg";
  if (type === "video") return "/next.svg";
  if (type === "audio") return "/vercel.svg";
  return "/file.svg";
}

export async function POST(request: NextRequest) {
  try {
    const { url, type } = await request.json() as { url: string; type: ReferenceType };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Get authorization header if present
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Create clients:
    // - `authClient` verifies user token
    // - `storageClient` uploads with service role when available, otherwise user auth token
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const storageClient = hasServiceRole
      ? createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        });

    // Verify user if token provided
    let userId: string | null = null;
    if (token) {
      const { data: { user } } = await authClient.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // Fetch the URL resource
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.statusText}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const inferredType = inferTypeFromContentType(contentType, type);

    let blob: Blob;
    let metadata: Record<string, any> = {};
    let extractedTitle: string | null = null;
    let extractedThumbnail: string | null = null;
    let mode: "direct" | "platform" = "direct";
    let sourceUrl: string = url;
    let effectiveContentType = contentType;
    let actualType = inferredType;

    if (contentType.includes("text/html")) {
      mode = "platform";
      const html = await response.text();
      const meta = extractMeta(html);
      extractedTitle = meta.title;
      metadata.description = meta.description;
      const urlCandidates = extractMediaCandidatesFromUrl(url);
      const htmlCandidates = extractMediaCandidatesFromHtml(html);
      const candidateMediaUrls = [
        ...urlCandidates,
        meta.video,
        meta.audio,
        meta.image,
        meta.linkImage,
        meta.jsonLdContentUrl,
        meta.twitterPlayer,
        ...htmlCandidates,
      ].filter(Boolean) as string[];

      let mediaDownloaded = false;
      for (const candidate of candidateMediaUrls) {
        try {
          const absoluteUrl = toAbsoluteUrl(candidate, url);
          const mediaResponse = await fetch(absoluteUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              Referer: url,
            },
          });

          if (!mediaResponse.ok) continue;

          const mediaType = mediaResponse.headers.get("content-type") || "application/octet-stream";
          if (mediaType.includes("text/html")) continue;

          blob = await mediaResponse.blob();
          effectiveContentType = mediaType;
          sourceUrl = absoluteUrl;
          actualType = inferTypeFromContentType(mediaType, inferTypeFromAssetUrl(absoluteUrl, inferredType));

          if (meta.image) {
            try {
              const absolutePreviewUrl = toAbsoluteUrl(meta.image, url);
              const uploadedPreview = await uploadPreviewFromUrl({
                supabase: storageClient,
                imageUrl: absolutePreviewUrl,
                baseType: actualType,
              });
              extractedThumbnail = uploadedPreview || absolutePreviewUrl;
            } catch {
              extractedThumbnail = null;
            }
          }

          mediaDownloaded = true;
          break;
        } catch {
          continue;
        }
      }

      if (!mediaDownloaded) {
        const fallbackHost = (() => {
          try {
            return new URL(url).hostname;
          } catch {
            return "Imported Link";
          }
        })();

        return NextResponse.json(
          {
            success: true,
            mode: "platform",
            sourceUrl: url,
            publicUrl: null,
            fileName: extractedTitle || fallbackHost,
            type: "link",
            actualType: "link",
            contentType,
            title: extractedTitle || null,
            metadata: {
              ...metadata,
              source_url: url,
              source: fallbackHost,
              thumbnail: fallbackPreviewByType("link"),
              import_note: "No downloadable media found; saved as link",
            },
          },
          { status: 200 }
        );
      }
    } else {
      blob = await response.blob();
      sourceUrl = url;
      actualType = inferredType;
    }

    // Generate filename from URL
    let fileName = "imported_file";
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.includes(".")) {
        fileName = decodeURIComponent(lastPart);
      } else {
        // Generate extension from content type
        const extMap: Record<string, string> = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/gif": ".gif",
          "image/webp": ".webp",
          "video/mp4": ".mp4",
          "video/webm": ".webm",
          "audio/mpeg": ".mp3",
          "audio/wav": ".wav",
          "application/pdf": ".pdf",
        };
        const ext = extMap[effectiveContentType] || "";
        fileName = `imported_${Date.now()}${ext}`;
      }
    } catch {
      fileName = `imported_${Date.now()}`;
    }

    // Build storage path
    const safeFileName = sanitizeFileName(fileName);
    const storagePath = `imports/${actualType}/${Date.now()}_${safeFileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await storageClient.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, {
        contentType: effectiveContentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = storageClient.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const sourceHost = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return null;
      }
    })();

    if (!extractedThumbnail) {
      extractedThumbnail = actualType === "image" ? urlData.publicUrl : fallbackPreviewByType(actualType);
    }

    return NextResponse.json({
      success: true,
      mode,
      sourceUrl,
      publicUrl: urlData.publicUrl,
      fileName,
      type: actualType,
      actualType,
      contentType: effectiveContentType,
      title: extractedTitle || null,
      metadata: {
        ...metadata,
        source_url: sourceUrl,
        source: sourceHost,
        thumbnail: extractedThumbnail,
      },
    });
  } catch (error: any) {
    console.error("Import URL error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import file" },
      { status: 500 }
    );
  }
}
