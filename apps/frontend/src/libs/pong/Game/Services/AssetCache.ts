import { Scene, AbstractMesh, SceneLoader } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export interface CachedAsset {
    blob: Blob;
    blobUrl: string;
    originalUrl: string;
    loadedAt: number;
    size: number;
}

class AssetCacheSingleton {
    private static instance: AssetCacheSingleton;
    
    public cache: Map<string, CachedAsset> = new Map();
    
    public downloadPromises: Map<string, Promise<CachedAsset>> = new Map();

    private constructor() { }

    public static getInstance(): AssetCacheSingleton {
        if (!AssetCacheSingleton.instance) {
            AssetCacheSingleton.instance = new AssetCacheSingleton();
        }
        return AssetCacheSingleton.instance;
    }

    public async loadModel(key: string, url: string, scene: Scene): Promise<AbstractMesh[]> {
        let cached = this.cache.get(key);
        
        if (!cached) {
            const existingPromise = this.downloadPromises.get(key);
            if (existingPromise) {
                cached = await existingPromise;
            } else {
                const downloadPromise = this.downloadAndCache(key, url);
                this.downloadPromises.set(key, downloadPromise);

                try {
                    cached = await downloadPromise;
                } finally {
                    this.downloadPromises.delete(key);
                }
            }
        } else { }

        return this.loadFromBlob(cached, scene);
    }

    public async preload(key: string, url: string): Promise<void> {
        if (this.cache.has(key)) { return; }

        const existingPromise = this.downloadPromises.get(key);
        if (existingPromise) {
            await existingPromise;
            return;
        }

        const downloadPromise = this.downloadAndCache(key, url);
        this.downloadPromises.set(key, downloadPromise);

        try {
            await downloadPromise;
        } finally {
            this.downloadPromises.delete(key);
        }
    }

    public has(key: string): boolean {
        return this.cache.has(key);
    }

    public remove(key: string): void {
        const cached = this.cache.get(key);
        if (cached) {
            URL.revokeObjectURL(cached.blobUrl);
            this.cache.delete(key);
        }
    }

    public clear(): void {
        this.cache.forEach((cached) => {
            URL.revokeObjectURL(cached.blobUrl);
        });
        this.cache.clear();
        this.downloadPromises.clear();
    }


    public getStats(): { size: number; totalBytes: number; keys: string[] } {
        let totalBytes = 0;
        this.cache.forEach((cached) => {
            totalBytes += cached.size;
        });
        
        return {
            size: this.cache.size,
            totalBytes,
            keys: Array.from(this.cache.keys()),
        };
    }

    public async downloadAndCache(key: string, url: string): Promise<CachedAsset> {
        const startTime = performance.now();
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const cached: CachedAsset = {
            blob,
            blobUrl,
            originalUrl: url,
            loadedAt: Date.now(),
            size: blob.size,
        };
        
        this.cache.set(key, cached);
        return cached;
    }

    public async loadFromBlob(cached: CachedAsset, scene: Scene): Promise<AbstractMesh[]> {
        const result = await SceneLoader.ImportMeshAsync(
            '',
            '',
            cached.blobUrl,
            scene,
            undefined,
            '.glb'
        );

        return result.meshes;
    }

    public formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

const AssetCache = AssetCacheSingleton.getInstance();

export default AssetCache;
