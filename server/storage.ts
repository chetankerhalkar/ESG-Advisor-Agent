// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { promises as fs } from "fs";
import path from "path";
import { ENV } from "./_core/env";
import { ensureUploadsDir, UPLOADS_DIR } from "./_core/uploads";

type StorageConfig = { baseUrl: string; apiKey: string };

const OPENAI_HOST_REGEX = /api\.openai\.com/i;

function shouldUseRemoteStorage(): boolean {
  const baseUrl = ENV.forgeApiUrl?.trim();
  if (!baseUrl) return false;
  return !OPENAI_HOST_REGEX.test(baseUrl);
}

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: sanitizeBaseUrl(baseUrl), apiKey };
}

function sanitizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim();
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = buildServiceUrl(baseUrl, "storage/upload");
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = buildServiceUrl(baseUrl, "storage/downloadUrl");
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function buildServiceUrl(baseUrl: string, path: string): URL {
  const url = new URL(baseUrl);
  const versionedBasePath = ensureVersionedPath(url.pathname);
  const targetPath = joinPath(versionedBasePath, path);
  const resolved = new URL(url.toString());
  resolved.pathname = targetPath;
  return resolved;
}

function ensureVersionedPath(pathname: string): string {
  const normalized =
    pathname === "/" ? "" : pathname.replace(/\/+$/, "");
  if (!normalized) {
    return "/v1";
  }
  return /\/v\d+$/i.test(normalized) ? normalized : `${normalized}/v1`;
}

function joinPath(basePath: string, suffix: string): string {
  const left = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath || "";
  const right = suffix.startsWith("/") ? suffix.slice(1) : suffix;
  return `${left.startsWith("/") ? left : `/${left}`}/${right}`.replace(
    /\/{2,}/g,
    "/"
  );
}

function normalizeKey(relKey: string): string {
  return relKey
    .replace(/\\/g, "/")
    .split("/")
    .filter(part => part && part !== "." && part !== "..")
    .join("/");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

function toBuffer(data: Buffer | Uint8Array | string): Buffer {
  if (typeof data === "string") {
    return Buffer.from(data, "utf-8");
  }
  return Buffer.from(data);
}

function buildLocalUrl(key: string): string {
  const segments = key
    .split("/")
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment));
  return `/uploads/${segments.join("/")}`;
}

async function saveLocally(
  key: string,
  data: Buffer | Uint8Array | string
): Promise<{ key: string; url: string }> {
  await ensureUploadsDir();
  const filePath = path.join(UPLOADS_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, toBuffer(data));
  return { key, url: buildLocalUrl(key) };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (!shouldUseRemoteStorage()) {
    console.warn("[Storage] Remote storage disabled. Falling back to local disk.");
    return saveLocally(key, data);
  }

  try {
    const { baseUrl, apiKey } = getStorageConfig();
    const uploadUrl = buildUploadUrl(baseUrl, key);
    const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: buildAuthHeaders(apiKey),
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      console.warn(
        `[Storage] Remote upload failed (${response.status} ${response.statusText}): ${message}. Falling back to local disk.`
      );
      return saveLocally(key, data);
    }

    const result = await response.json();
    if (!result?.url) {
      console.warn("[Storage] Remote upload returned no URL. Falling back to local disk.");
      return saveLocally(key, data);
    }
    return { key, url: result.url };
  } catch (error) {
    console.warn("[Storage] Remote upload error. Falling back to local disk.", error);
    return saveLocally(key, data);
  }
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (!shouldUseRemoteStorage()) {
    return { key, url: buildLocalUrl(key) };
  }

  try {
    const { baseUrl, apiKey } = getStorageConfig();
    return {
      key,
      url: await buildDownloadUrl(baseUrl, key, apiKey),
    };
  } catch (error) {
    console.warn("[Storage] Remote download failed. Falling back to local path.", error);
    return { key, url: buildLocalUrl(key) };
  }
}
