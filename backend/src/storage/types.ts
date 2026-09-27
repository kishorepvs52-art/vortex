// Storage abstraction — swapping local disk for S3/GCS later means
// implementing this interface and changing STORAGE_DRIVER, nothing else.

export interface StoredImage {
  storageKey: string;
  thumbKey: string;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  sha256: string;
}

export interface SaveImageInput {
  buffer: Buffer;
  originalName: string;
  declaredMimeType: string;
}

export interface StorageProvider {
  readonly name: string;
  /** Validate (magic bytes), normalise, persist image + thumbnail. */
  saveImage(input: SaveImageInput): Promise<StoredImage>;
  /** Absolute filesystem/object path for streaming, or null when missing. */
  getLocalPath(storageKey: string): string | null;
  delete(storageKey: string): Promise<void>;
}
