// Real drag-and-drop image upload with client-side validation,
// preview, progress, and remove/re-upload.
import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { cn } from '../../lib/cn';
import { ACCEPT_ATTR, MAX_UPLOAD_MB } from '../../lib/constants';
import { fmtBytes } from '../../lib/format';
import { toast } from '../../store/toastStore';
import { ProgressBar } from '../ui/Feedback';

export interface DropzoneState {
  file: File | null;
  previewUrl: string | null;
  progress: number;
  uploading: boolean;
}

export function Dropzone({
  file,
  previewUrl,
  progress,
  uploading,
  onFile,
  onClear,
  disabled,
}: {
  file: File | null;
  previewUrl: string | null;
  progress: number;
  uploading: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const r = rejections[0];
        const code = r.errors[0]?.code;
        if (code === 'file-too-large') {
          toast.error('File too large', `Maximum allowed size is ${MAX_UPLOAD_MB} MB (yours: ${fmtBytes(r.file.size)})`);
        } else if (code === 'file-invalid-type') {
          toast.error('Unsupported file type', 'Please upload a JPEG, PNG or WebP image of the crop/leaf.');
        } else {
          toast.error('Upload rejected', r.errors[0]?.message ?? 'Invalid file');
        }
        return;
      }
      const f = accepted[0];
      if (f) onFile(f);
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
    maxSize: MAX_UPLOAD_MB * 1024 * 1024,
    multiple: false,
    disabled: disabled || uploading,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  // Preview mode
  if (file && previewUrl) {
    return (
      <div className="glass p-4">
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-void">
          <img src={previewUrl} alt="Crop preview" className="w-full max-h-80 object-contain" />
          {uploading && (
            <div className="absolute inset-0 bg-void/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
              <div className="w-full max-w-xs px-6">
                <ProgressBar value={progress} />
                <p className="text-center text-xs text-neon font-display font-600 mt-2">Uploading… {progress}%</p>
              </div>
              {/* Scan line effect over the image during upload */}
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-transparent via-neon/20 to-transparent animate-scan-line pointer-events-none" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm text-cream truncate font-500">{file.name}</p>
            <p className="text-xs text-muted">{fmtBytes(file.size)} · {file.type}</p>
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="text-xs font-display font-600 text-danger border border-danger/30 rounded-lg px-3 py-1.5 hover:bg-danger/10 transition-colors disabled:opacity-40"
            >
              ✕ Remove & re-upload
            </button>
          )}
        </div>
      </div>
    );
  }

  // Drop mode
  return (
    <div
      {...getRootProps()}
      className={cn(
        'glass relative cursor-pointer text-center px-6 py-12 md:py-16 transition-all duration-300 border-2 border-dashed',
        isDragActive || dragActive
          ? 'border-neon/70 bg-neon/[0.06] shadow-neon scale-[1.01]'
          : 'border-white/15 hover:border-neon/40 hover:bg-white/[0.03]',
        (disabled || uploading) && 'opacity-50 pointer-events-none',
      )}
    >
      <input {...getInputProps()} accept={ACCEPT_ATTR} aria-label="Upload crop image" />
      <div className={cn('w-20 h-20 mx-auto mb-5 rounded-3xl glass flex items-center justify-center text-4xl', isDragActive ? 'animate-pulse text-neon' : 'animate-float-slow text-leaf')}>
        🍃
      </div>
      <p className="font-display font-600 text-lg text-cream">
        {isDragActive ? 'Release to attach your crop photo' : 'Drag & drop a crop/leaf photo'}
      </p>
      <p className="text-sm text-muted mt-2">
        or <span className="text-neon font-600 underline underline-offset-4 decoration-neon/40">browse files</span> from your device
      </p>
      <p className="text-xs text-muted/60 mt-4">JPEG · PNG · WebP — up to {MAX_UPLOAD_MB} MB · a single clear, well-lit leaf photo works best</p>
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" aria-hidden>
        <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-neon/[0.05] to-transparent animate-scan-line" />
      </div>
    </div>
  );
}
