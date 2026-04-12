import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ProgressPhoto {
  id: string;
  user_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  taken_at: string;
  notes: string | null;
  is_visible_to_coach: boolean;
  created_at: string;
  signedUrl?: string;
  thumbnailUrl?: string;
}

async function createThumbnail(file: File, maxSize = 400): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        resolve(blob || new Blob());
      }, 'image/jpeg', 0.7);
    };
    img.src = url;
  });
}

export function useProgressPhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhotos = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from('progress_photos')
        .select('id, user_id, storage_path, thumbnail_path, taken_at, notes, is_visible_to_coach, created_at')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false });

      if (data) {
        const withUrls = await Promise.all(data.map(async (photo: any) => {
          const thumbPath = photo.thumbnail_path || photo.storage_path;
          const [full, thumb] = await Promise.all([
            supabase.storage.from('progress-photos').createSignedUrl(photo.storage_path, 3600),
            supabase.storage.from('progress-photos').createSignedUrl(thumbPath, 3600),
          ]);
          return { ...photo, signedUrl: full.data?.signedUrl, thumbnailUrl: thumb.data?.signedUrl } as ProgressPhoto;
        }));
        setPhotos(withUrls);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const uploadPhoto = useCallback(async (file: File, takenAt?: Date, notes?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const storagePath = `${user.id}/${timestamp}_photo.${ext}`;
    const thumbPath = `${user.id}/${timestamp}_thumb.jpg`;

    // Upload thumbnail
    const thumbBlob = await createThumbnail(file);
    await supabase.storage.from('progress-photos').upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' });

    // Upload full image
    const { error: uploadError } = await supabase.storage.from('progress-photos').upload(storagePath, file, { contentType: file.type });
    if (uploadError) return { error: uploadError };

    const { data, error } = await supabase.from('progress_photos').insert({
      user_id: user.id, storage_path: storagePath, thumbnail_path: thumbPath,
      taken_at: (takenAt || new Date()).toISOString(), notes: notes || null,
    }).select().single();

    if (data && !error) {
      await fetchPhotos();
    }
    return { data, error };
  }, [user, fetchPhotos]);

  const deletePhotos = useCallback(async (ids: string[]) => {
    if (!user) return;
    const toDelete = photos.filter(p => ids.includes(p.id));
    const paths = toDelete.flatMap(p => [p.storage_path, p.thumbnail_path].filter(Boolean) as string[]);
    if (paths.length) await supabase.storage.from('progress-photos').remove(paths);
    await supabase.from('progress_photos').delete().in('id', ids);
    setPhotos(prev => prev.filter(p => !ids.includes(p.id)));
  }, [user, photos]);

  const toggleCoachVisibility = useCallback(async (ids: string[], visible: boolean) => {
    if (!user) return;
    await supabase.from('progress_photos').update({ is_visible_to_coach: visible }).in('id', ids);
    setPhotos(prev => prev.map(p => ids.includes(p.id) ? { ...p, is_visible_to_coach: visible } : p));
  }, [user]);

  const getTodayPhoto = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return photos.find(p => p.taken_at.startsWith(today));
  }, [photos]);

  return { photos, loading, uploadPhoto, deletePhotos, toggleCoachVisibility, getTodayPhoto, refetch: fetchPhotos };
}
