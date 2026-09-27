// Local-disk storage provider with a full sharp validation/normalisation pipeline:
//   magic-byte format detection (spoofed extensions rejected) → EXIF strip &
//   auto-rotate → resize ≤1600px → re-encode JPEG q82 → 320px thumbnail → SHA-256.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { IMAGE_MAX_EDGE_PX, IMAGE_THUMB_PX, IMAGE_JPEG_QUALITY } from '../config/constants.js';
import type { SaveImageInput, StorageProvider, StoredImage } from './types.js';

const ALLOWED_SHARP_FORMATS = new Set(['jpeg', 'png', 'webp']);

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local-disk';

  constructor(private readonly rootDir: string = env.uploadDir) {
    fs.mkdirSync(this.rootDir, { recursive: true });
    fs.mkdirSync(path.join(this.rootDir, 'thumbs'), { recursive: true });
  }

  async saveImage({ buffer, originalName }: SaveImageInput): Promise<StoredImage> {
    // ── Layer 2 validation: real format from file content, not headers ──
    let meta: sharp.Metadata;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      throw ApiError.unprocessable(
        'IMAGE_UNREADABLE',
        'The uploaded file could not be decoded as an image. Please upload a valid photo of the crop/leaf.',
      );
    }
    if (!meta.format || !ALLOWED_SHARP_FORMATS.has(meta.format)) {
      throw ApiError.unprocessable(
        'INVALID_FILE_TYPE',
        `Unsupported image format${meta.format ? ` "${meta.format}"` : ''}. Allowed: JPEG, PNG, WebP.`,
      );
    }
    if ((meta.width ?? 0) < 64 || (meta.height ?? 0) < 64) {
      throw ApiError.unprocessable(
        'IMAGE_TOO_SMALL',
        'Image is too small to analyse (minimum 64×64 px). Please upload a clearer photo.',
      );
    }

    // ── Normalise ──
    const normalized = await sharp(buffer)
      .rotate() // EXIF orientation, metadata stripped by re-encode
      .resize({
        width: IMAGE_MAX_EDGE_PX,
        height: IMAGE_MAX_EDGE_PX,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: IMAGE_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    const thumb = await sharp(normalized)
      .resize({ width: IMAGE_THUMB_PX, height: IMAGE_THUMB_PX, fit: 'inside' })
      .jpeg({ quality: 70 })
      .toBuffer();

    const info = await sharp(normalized).metadata();
    const sha256 = crypto.createHash('sha256').update(normalized).digest('hex');

    // ── Persist under uploads/YYYY/MM/<uuid>.jpg ──
    const now = new Date();
    const relDir = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
    const uuid = crypto.randomUUID();
    const storageKey = path.posix.join(relDir, `${uuid}.jpg`);
    const thumbKey = path.posix.join('thumbs', relDir, `${uuid}.jpg`);

    await fsp.mkdir(path.dirname(this.abs(storageKey)), { recursive: true });
    await fsp.mkdir(path.dirname(this.abs(thumbKey)), { recursive: true });
    await fsp.writeFile(this.abs(storageKey), normalized);
    await fsp.writeFile(this.abs(thumbKey), thumb);

    logger.info('storage', `Saved ${originalName} → ${storageKey} (${normalized.length} B)`);

    return {
      storageKey,
      thumbKey,
      sizeBytes: normalized.length,
      mimeType: 'image/jpeg',
      width: info.width ?? IMAGE_MAX_EDGE_PX,
      height: info.height ?? IMAGE_MAX_EDGE_PX,
      sha256,
    };
  }

  getLocalPath(storageKey: string): string | null {
    const abs = this.abs(storageKey);
    // Path-traversal guard: resolved path must stay inside the upload root
    if (!abs.startsWith(path.resolve(this.rootDir) + path.sep)) return null;
    return fs.existsSync(abs) ? abs : null;
  }

  async delete(storageKey: string): Promise<void> {
    const abs = this.getLocalPath(storageKey);
    if (abs) await fsp.unlink(abs).catch(() => undefined);
  }

  private abs(storageKey: string): string {
    return path.resolve(this.rootDir, storageKey);
  }
}

/** Active storage provider — swap here when S3/GCS drivers are added. */
export const storage: StorageProvider = new LocalStorageProvider();
