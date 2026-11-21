import { CameraIcon, Loader, MailIcon, RotateCcwIcon, UserIcon } from 'lucide-react';
import { useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRemoveAvatar } from '@/hooks/apis/users/useRemoveAvatar';
import { useUpdateProfile } from '@/hooks/apis/users/useUpdateProfile';
import { useUploadAvatar } from '@/hooks/apis/users/useUploadAvatar';
import { useAuth } from '@/hooks/context/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AVATAR_ACCEPT, isGeneratedAvatar, validateAvatarFile } from '@/lib/avatar';

const inputClass =
    'h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-dash-violet-300 focus:ring-2 focus:ring-dash-violet-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400';

export const ProfileSettings = () => {
    const { auth, setAuth } = useAuth();
    const { toast } = useToast();
    const { updateProfileMutation, isPending } = useUpdateProfile();
    const { uploadAvatarMutation, isPending: isUploadingAvatar } = useUploadAvatar();
    const { removeAvatarMutation, isPending: isRemovingAvatar } = useRemoveAvatar();

    const [username, setUsername] = useState(auth?.user?.username ?? '');
    const [email, setEmail] = useState(auth?.user?.email ?? '');
    const [formError, setFormError] = useState('');
    const fileInputRef = useRef(null);

    const displayName = auth?.user?.username || 'User';
    const initial = displayName.charAt(0).toUpperCase();
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const hasChanges =
        trimmedUsername !== (auth?.user?.username ?? '') ||
        trimmedEmail !== (auth?.user?.email ?? '');
    const hasCustomAvatar = !isGeneratedAvatar(auth?.user?.avatar);
    const isAvatarBusy = isUploadingAvatar || isRemovingAvatar;

    function persistUser(updated) {
        const nextUser = { ...(auth?.user ?? {}), ...updated };
        setAuth((previous) => ({ ...previous, user: nextUser }));
        localStorage.setItem('user', JSON.stringify(nextUser));
        return nextUser;
    }

    async function handleAvatarSelected(event) {
        const file = event.target.files?.[0];
        // Allow picking the same file again after a failed attempt.
        event.target.value = '';
        if (!file) return;

        const validationMessage = validateAvatarFile(file);
        if (validationMessage) {
            toast({ title: validationMessage, variant: 'destructive' });
            return;
        }

        try {
            const updated = await uploadAvatarMutation({ file });
            persistUser(updated);
            toast({ title: 'Profile photo updated' });
        } catch (error) {
            toast({
                title: error?.message || 'Could not upload your profile photo',
                variant: 'destructive'
            });
        }
    }

    async function handleResetAvatar() {
        try {
            const updated = await removeAvatarMutation();
            persistUser(updated);
            toast({ title: 'Using your generated avatar again' });
        } catch (error) {
            toast({
                title: error?.message || 'Could not reset your avatar',
                variant: 'destructive'
            });
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setFormError('');

        if (!/^[a-zA-Z0-9]{2,}$/.test(trimmedUsername)) {
            setFormError('Username must be at least 2 characters and alphanumeric.');
            return;
        }

        if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
            setFormError('Enter a valid email address.');
            return;
        }

        if (!hasChanges) {
            toast({ title: 'No changes to save' });
            return;
        }

        try {
            const updated = await updateProfileMutation({
                username: trimmedUsername,
                email: trimmedEmail
            });

            const nextUser = persistUser(updated);

            setUsername(nextUser.username ?? '');
            setEmail(nextUser.email ?? '');
            toast({ title: 'Profile updated' });
        } catch (error) {
            setFormError(
                error?.message || error?.err || 'Could not update your profile.'
            );
        }
    }

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                <div className="border-b border-gray-200 px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900">Profile</h3>
                    <p className="mt-0.5 text-xs text-gray-400">
                        This is how you appear across the workspace.
                    </p>
                </div>

                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
                    <div className="relative shrink-0">
                        <Avatar className="size-16">
                            <AvatarImage src={auth?.user?.avatar} alt={displayName} />
                            <AvatarFallback className="bg-gradient-to-br from-dash-violet-500 to-dash-violet-700 text-lg font-semibold text-white">
                                {initial}
                            </AvatarFallback>
                        </Avatar>
                        {isAvatarBusy && (
                            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                <Loader className="size-4 animate-spin text-white" />
                            </span>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                            {displayName}
                        </p>
                        <p className="truncate text-xs text-gray-400">
                            {auth?.user?.email}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400">
                            By default your avatar is generated automatically from your
                            username. You can upload your own picture instead.
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isAvatarBusy}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isUploadingAvatar ? (
                                    <Loader className="size-3.5 animate-spin" />
                                ) : (
                                    <CameraIcon className="size-3.5" />
                                )}
                                {isUploadingAvatar ? 'Uploading…' : 'Upload photo'}
                            </button>

                            {hasCustomAvatar && (
                                <button
                                    type="button"
                                    onClick={handleResetAvatar}
                                    disabled={isAvatarBusy}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-600 shadow-xs transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isRemovingAvatar ? (
                                        <Loader className="size-3.5 animate-spin" />
                                    ) : (
                                        <RotateCcwIcon className="size-3.5" />
                                    )}
                                    Use generated
                                </button>
                            )}
                        </div>

                        <p className="mt-1.5 text-[11px] text-gray-400">
                            PNG, JPG, GIF or WebP · up to 5 MB
                        </p>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={AVATAR_ACCEPT}
                            className="hidden"
                            onChange={handleAvatarSelected}
                        />
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                <div className="border-b border-gray-200 px-5 py-4">
                    <h3 className="text-sm font-semibold text-gray-900">Account details</h3>
                    <p className="mt-0.5 text-xs text-gray-400">
                        Your username is used for @mentions and message attribution.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 px-5 py-5">
                        <div>
                            <label
                                htmlFor="settings-username"
                                className="mb-1.5 block text-xs font-medium text-gray-600"
                            >
                                Username
                            </label>
                            <div className="relative">
                                <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    id="settings-username"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    placeholder="username"
                                    autoComplete="username"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="settings-email"
                                className="mb-1.5 block text-xs font-medium text-gray-600"
                            >
                                Email
                            </label>
                            <div className="relative">
                                <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    id="settings-email"
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {formError && (
                            <p className="rounded-lg bg-dash-red-500/10 px-3 py-2 text-xs text-dash-red-700">
                                {formError}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-3.5">
                        <p className="hidden text-[11px] text-gray-400 sm:block">
                            Changing your email does not sign you out.
                        </p>
                        <button
                            type="submit"
                            disabled={isPending || !hasChanges}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-dash-violet-500 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-dash-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isPending && <Loader className="size-3.5 animate-spin" />}
                            Save changes
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
};
