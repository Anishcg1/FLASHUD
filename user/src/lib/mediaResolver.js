import { useState, useEffect } from 'react';

// Detect if a URL points to a video file
export const isVideo = (url) => {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase().split('?')[0];
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.mov');
};

// Extract filename from URL
export const getFilename = (url) => {
    if (!url || typeof url !== 'string') return '';
    try {
        const decodedUrl = decodeURIComponent(url);
        const parts = decodedUrl.split('/');
        return parts[parts.length - 1].split('?')[0];
    } catch {
        return '';
    }
};

// Check if a file exists locally in the public folder.
// We MUST verify Content-Type because Vite's SPA fallback returns HTTP 200
// with text/html for any unknown path — response.ok alone is not enough.
const checkLocalFileExists = async (path) => {
    if (!path || typeof path !== 'string') return false;
    try {
        const response = await fetch(path, { method: 'HEAD' });
        if (!response.ok) return false;
        const contentType = response.headers.get('content-type') || '';
        // Only accept genuine image or video files, never HTML fallback pages
        return contentType.startsWith('image/') || contentType.startsWith('video/');
    } catch {
        return false;
    }
};

// React hook to resolve remote URL to local public folder if it exists.
// IMPORTANT: We immediately render with the remote URL so images are never blank.
// The local check runs in the background and silently upgrades to local if found.
export const useLocalOrRemoteUrl = (url) => {
    const [resolvedUrl, setResolvedUrl] = useState(url);

    useEffect(() => {
        // Always start by showing the provided URL immediately —
        // this prevents a blank flash while the async HEAD check is pending.
        setResolvedUrl(url || null);

        if (!url || typeof url !== 'string') return;

        // Already a local/blob/data path — no need to check
        if (url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) {
            return;
        }

        let isMounted = true;
        const checkLocalPaths = async () => {
            const filename = getFilename(url);
            if (!filename) return; // keep showing remote URL (already set above)

            const isVid = isVideo(filename);
            const localPaths = isVid
                ? [`/hero_vid/${filename}`, `/${filename}`]
                : [`/Images/${filename}`, `/${filename}`];

            for (const path of localPaths) {
                const exists = await checkLocalFileExists(path);
                if (exists && isMounted) {
                    setResolvedUrl(path);
                    return;
                }
            }
            // No local file found — remote URL is already being shown, nothing to do.
        };

        checkLocalPaths();

        return () => {
            isMounted = false;
        };
    }, [url]);

    return resolvedUrl;
};
