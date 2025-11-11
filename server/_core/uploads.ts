import path from "path";
import { promises as fs } from "fs";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}
