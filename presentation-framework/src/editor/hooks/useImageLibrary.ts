import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { imageLibraryService, AddImageLibraryItemInput } from '@/editor/services/ImageLibraryService';
import type { ImageLibraryItem, ImageLibraryState } from '@/editor/types/imageLibrary';

interface UseImageLibraryOptions {
  autoHydrate?: boolean;
}

interface UseImageLibraryReturn extends ImageLibraryState {
  addItem: (item: AddImageLibraryItemInput) => ImageLibraryItem;
  updateItem: (id: string, update: Partial<ImageLibraryItem> | ((item: ImageLibraryItem) => ImageLibraryItem)) => ImageLibraryItem | null;
  removeItem: (id: string) => void;
  sync: (force?: boolean) => Promise<void>;
  refreshFromServer: (force?: boolean) => Promise<void>;
}

export function useImageLibrary(options: UseImageLibraryOptions = {}): UseImageLibraryReturn {
  const state = useSyncExternalStore(
    imageLibraryService.subscribe,
    imageLibraryService.getSnapshot,
    imageLibraryService.getServerSnapshot,
  );

  useEffect(() => {
    if (options.autoHydrate === false) {
      return;
    }

    imageLibraryService.hydrateFromServer().catch(() => {
      // errors are logged inside the service; swallow to avoid noisy console in components
    });
  }, [options.autoHydrate]);

  const addItem = useCallback((item: AddImageLibraryItemInput) => imageLibraryService.addItem(item), []);
  const updateItem = useCallback(
    (id: string, update: Partial<ImageLibraryItem> | ((item: ImageLibraryItem) => ImageLibraryItem)) =>
      imageLibraryService.updateItem(id, update),
    [],
  );
  const removeItem = useCallback((id: string) => imageLibraryService.removeItem(id), []);
  const sync = useCallback((force: boolean = false) => imageLibraryService.syncPendingItems(force), []);
  const refreshFromServer = useCallback((force: boolean = false) => imageLibraryService.hydrateFromServer(force), []);

  return {
    ...state,
    addItem,
    updateItem,
    removeItem,
    sync,
    refreshFromServer,
  };
}


