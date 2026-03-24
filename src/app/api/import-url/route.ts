import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ReferenceType } from "@/lib/fileType";

const STORAGE_BUCKET = "Link-UpWorkpace";

// Create a Supabase client with service role for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  const description = getMeta("description") || getMeta("og:description") || null;
  return { title, image, description };
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

    // Create supabase client (use service key for storage operations)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user if token provided
    let userId: string | null = null;
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
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

    if (contentType.includes("text/html")) {
      const html = await response.text();
      const meta = extractMeta(html);
      extractedTitle = meta.title;
      metadata.description = meta.description;

      if (meta.image) {
        try {
          const absolutePreviewUrl = toAbsoluteUrl(meta.image, url);
          const uploadedPreview = await uploadPreviewFromUrl({
            supabase,
            imageUrl: absolutePreviewUrl,
            baseType: inferredType,
          });
          extractedThumbnail = uploadedPreview || absolutePreviewUrl;
        } catch {
          extractedThumbnail = null;
        }
      }

      blob = new Blob([html], { type: "text/html" });
    } else {
      blob = await response.blob();
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
        const ext = extMap[contentType] || "";
        fileName = `imported_${Date.now()}${ext}`;
      }
    } catch {
      fileName = `imported_${Date.now()}`;
    }

    // Build storage path
    const safeFileName = sanitizeFileName(fileName);
    const storagePath = `imports/${inferredType}/${Date.now()}_${safeFileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, {
        contentType,
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
    const { data: urlData } = supabase.storage
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
      extractedThumbnail = inferredType === "image" ? urlData.publicUrl : fallbackPreviewByType(inferredType);
    }

    return NextResponse.json({
      success: true,
      publicUrl: urlData.publicUrl,
      fileName,
      type: inferredType,
      contentType,
      title: extractedTitle || null,
      metadata: {
        ...metadata,
        source_url: url,
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
