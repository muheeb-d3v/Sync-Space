import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/context/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useFileUpload = (channelId) => {
    const { auth } = useAuth();
    const { toast } = useToast();

    const [uploads, setUploads] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    const addUpload = useCallback((file) => {
        const id = `${file.name}-${file.size}-${Date.now()}`;
        setUploads((prev) => [...prev, { id, file, status: 'pending', progress: 0 }]);
        return id;
    }, []);

    const updateProgress = useCallback((id, progress) => {
        setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, progress } : u))
        );
    }, []);

    const setStatus = useCallback((id, status, error) => {
        setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, status, error } : u))
        );
    }, []);

    const clearCompleted = useCallback(() => {
        setUploads((prev) => prev.filter((u) => u.status !== 'completed' && u.status !== 'error'));
    }, []);

    const uploadFiles = useCallback(
        async (files, caption) => {
            if (!auth?.token) {
                toast({ title: 'Authentication required', variant: 'destructive' });
                return null;
            }

            setIsUploading(true);

            const uploadIds = files.map((file) => addUpload(file));

            try {
                const formData = new FormData();
                if (caption !== undefined && caption !== null) {
                    formData.append('body', caption);
                }
                for (const file of files) {
                    formData.append('attachments', file);
                }

                // Use XMLHttpRequest for progress tracking.
                const response = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();

                    const baseURL = import.meta.env.VITE_BACKEND_API_URL || '';
                    const url = `${baseURL}/messages/${channelId}`;

                    xhr.open('POST', url, true);
                    xhr.setRequestHeader('x-access-token', auth.token);
                    // ngrok dev-tunnel workaround (see axiosConfig.js).
                    xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const progress = Math.round((e.loaded / e.total) * 100);
                            // Apply progress to all uploads since we send them together.
                            uploadIds.forEach((id) => updateProgress(id, progress));
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                resolve(data?.data ?? data);
                            } catch (parseErr) {
                                reject(new Error('Invalid server response'));
                            }
                        } else {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                reject(new Error(data?.message || `Upload failed (${xhr.status})`));
                            } catch {
                                reject(new Error(`Upload failed (${xhr.status})`));
                            }
                        }
                    };

                    xhr.onerror = () => {
                        reject(new Error('Network error during upload'));
                    };

                    xhr.onabort = () => {
                        reject(new Error('Upload cancelled'));
                    };

                    xhr.send(formData);
                });

                // Mark all uploads as completed.
                uploadIds.forEach((id) => setStatus(id, 'completed'));

                setIsUploading(false);
                clearCompleted();

                return response;
            } catch (error) {
                uploadIds.forEach((id) => setStatus(id, 'error', error.message));
                setIsUploading(false);
                toast({ title: error.message || 'Upload failed', variant: 'destructive' });
                throw error;
            }
        },
        [auth?.token, channelId, addUpload, updateProgress, setStatus, clearCompleted, toast]
    );

    const retryUpload = useCallback((id) => {
        const upload = uploads.find((u) => u.id === id);
        if (!upload || upload.status !== 'error') return;
        setStatus(id, 'pending', undefined);
        return uploadFiles([upload.file], '');
    }, [uploads, setStatus, uploadFiles]);

    const cancelUpload = useCallback((id) => {
        setUploads((prev) => prev.filter((u) => u.id !== id));
    }, []);

    return {
        uploads,
        isUploading,
        uploadFiles,
        retryUpload,
        cancelUpload,
        addUpload,
        updateProgress,
        setStatus,
    };
};
