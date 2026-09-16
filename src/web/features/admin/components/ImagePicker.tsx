import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { compressImage } from '../lib/image-compress';
import { uploadProductImage } from '../../../api/admin.api';

type PickerStatus = 'idle' | 'compressing' | 'uploading' | 'error';

interface ImagePickerProps {
  imageKey: string | null;
  onChange: (imageKey: string | null) => void;
  onBusyChange: (busy: boolean) => void;
}

export function ImagePicker({ imageKey, onChange, onBusyChange }: ImagePickerProps) {
  const [status, setStatus] = useState<PickerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    onBusyChange(status === 'compressing' || status === 'uploading');
  }, [status, onBusyChange]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setStatus('compressing');

    try {
      const { thumb, full } = await compressImage(file);
      setStatus('uploading');
      const { imageKey: newImageKey } = await uploadProductImage(thumb, full);
      setStatus('idle');
      onChange(newImageKey);
    } catch (caught) {
      setStatus('error');
      setError(
        caught instanceof Error ? caught.message : 'No pudimos subir la foto. Probá de nuevo.',
      );
    }
  };

  const handleRemove = (): void => {
    setPreviewUrl(null);
    setError(null);
    onChange(null);
  };

  const displayUrl = previewUrl ?? (imageKey ? `/img/${imageKey}-480` : null);

  return (
    <div className="flex flex-col gap-2">
      <span>Foto</span>

      {displayUrl ? (
        <img src={displayUrl} alt="" className="h-32 w-32 rounded object-cover" />
      ) : null}

      <input
        type="file"
        accept="image/*"
        aria-label="Foto"
        onChange={(event) => void handleFileChange(event)}
      />

      {status === 'compressing' ? <p className="text-sm text-gray-500">Optimizando foto…</p> : null}
      {status === 'uploading' ? <p className="text-sm text-gray-500">Subiendo…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {displayUrl ? (
        <button
          type="button"
          onClick={handleRemove}
          className="w-fit text-sm text-red-600 underline"
        >
          Quitar foto
        </button>
      ) : null}
    </div>
  );
}
