import { useQueryClient } from '@tanstack/react-query';
import { CopyIcon, Loader, Trash2Icon, UserPlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { InviteMemberModal } from '@/components/molecules/Workspace/InviteMemberModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDeleteWorkspace } from '@/hooks/apis/workspaces/useDeleteWorkspace';
import { useGetWorkspaceById } from '@/hooks/apis/workspaces/useGetWorkspaceById';
import { useUpdateWorkspace } from '@/hooks/apis/workspaces/useUpdateWorkspace';
import { useAuth } from '@/hooks/context/useAuth';
import { useInviteMemberModal } from '@/hooks/context/useInviteMemberModal';
import { useToast } from '@/hooks/use-toast';

const fieldClass =
    'w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-dash-violet-300 focus:ring-2 focus:ring-dash-violet-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400';

function getMemberUser(member) {
    const user = member?.memberId;
    return user && typeof user === 'object' ? user : null;
}

export const WorkspaceSettings = () => {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { auth } = useAuth();

    const { workspace, isLoading, isSuccess } = useGetWorkspaceById(workspaceId);
    const { updateWorkspaceMutation, isPending: isUpdating } =
        useUpdateWorkspace(workspaceId);
    const { deleteWorkspaceMutation, isPending: isDeleting } =
        useDeleteWorkspace(workspaceId);
    const { setOpenInviteMemberModal } = useInviteMemberModal();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [formError, setFormError] = useState('');
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    useEffect(() => {
        setName(workspace?.name ?? '');
        setDescription(workspace?.description ?? '');
    }, [workspace?._id, workspace?.name, workspace?.description]);

    const currentUserId = String(auth?.user?._id ?? auth?.user?.id ?? '');
    const membership = (workspace?.members ?? []).find(
        (member) => String(member?.memberId?._id ?? member?.memberId) === currentUserId
    );
    const isAdmin = membership?.role === 'Admin';
    const members = workspace?.members ?? [];
    const hasChanges =
        name.trim() !== (workspace?.name ?? '') ||
        description.trim() !== (workspace?.description ?? '');

    async function handleSave(event) {
        event.preventDefault();
        setFormError('');

        if (!isAdmin) return;

        if (name.trim().length < 3) {
            setFormError('Workspace name must be at least 3 characters long.');
            return;
        }

        if (!hasChanges) {
            toast({ title: 'No changes to save' });
            return;
        }

        try {
            await updateWorkspaceMutation({
                name: name.trim(),
                description: description.trim()
            });
            queryClient.invalidateQueries({
                queryKey: [`fetchWorkspaceById-${workspaceId}`]
            });
            queryClient.invalidateQueries({ queryKey: ['fetchWorkspaces'] });
            toast({ title: 'Workspace updated' });
        } catch (error) {
            setFormError(
                error?.message || error?.err || 'Could not update the workspace.'
            );
        }
    }

    async function handleCopyJoinCode() {
        if (!workspace?.joinCode) return;
        try {
            await navigator.clipboard.writeText(workspace.joinCode);
            toast({ title: 'Join code copied to clipboard' });
        } catch {
            toast({
                title: 'Could not copy to clipboard',
                variant: 'destructive'
            });
        }
    }

    async function handleDelete() {
        try {
            await deleteWorkspaceMutation();
            queryClient.invalidateQueries({ queryKey: ['fetchWorkspaces'] });
            toast({ title: 'Workspace deleted' });
            navigate('/home');
        } catch (error) {
            toast({
                title: error?.message || error?.err || 'Could not delete workspace',
                variant: 'destructive'
            });
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 shadow-xs">
                <Loader className="size-5 animate-spin text-dash-violet-500" />
            </div>
        );
    }

    if (!isSuccess || !workspace) {
        return (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                Could not load workspace settings.
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            Workspace details
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Name and description shown to everyone in this workspace.
                        </p>
                    </div>
                    {isAdmin ? (
                        <span className="rounded-full bg-dash-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dash-violet-700">
                            Admin
                        </span>
                    ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                            Read only
                        </span>
                    )}
                </div>

                <form onSubmit={handleSave}>
                    <div className="space-y-4 px-5 py-5">
                        <div>
                            <label
                                htmlFor="settings-workspace-name"
                                className="mb-1.5 block text-xs font-medium text-gray-600"
                            >
                                Workspace name
                            </label>
                            <input
                                id="settings-workspace-name"
                                value={name}
                                disabled={!isAdmin}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Workspace name"
                                className={`${fieldClass} h-10`}
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="settings-workspace-description"
                                className="mb-1.5 block text-xs font-medium text-gray-600"
                            >
                                Description
                            </label>
                            <textarea
                                id="settings-workspace-description"
                                value={description}
                                disabled={!isAdmin}
                                onChange={(event) => setDescription(event.target.value)}
                                rows={3}
                                placeholder="What is this workspace about?"
                                className={`${fieldClass} py-2.5`}
                            />
                        </div>

                        {formError && (
                            <p className="rounded-lg bg-dash-red-500/10 px-3 py-2 text-xs text-dash-red-700">
                                {formError}
                            </p>
                        )}

                        {!isAdmin && (
                            <p className="text-[11px] text-gray-400">
                                Only workspace admins can change these settings.
                            </p>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="flex items-center justify-end border-t border-gray-200 px-5 py-3.5">
                            <button
                                type="submit"
                                disabled={isUpdating || !hasChanges}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-dash-violet-500 px-4 text-sm font-medium text-white shadow-xs transition-colors hover:bg-dash-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isUpdating && <Loader className="size-3.5 animate-spin" />}
                                Save changes
                            </button>
                        </div>
                    )}
                </form>
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            Members ({members.length})
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                            People with access to this workspace.
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={() => setOpenInviteMemberModal(true)}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-dash-violet-500/10 px-2.5 text-xs font-medium text-dash-violet-700 transition-colors hover:bg-dash-violet-500 hover:text-white"
                        >
                            <UserPlusIcon className="size-3.5" />
                            Invite
                        </button>
                    )}
                </div>

                <div className="divide-y divide-gray-100">
                    {members.map((member, index) => {
                        const user = getMemberUser(member);
                        const displayName =
                            user?.username ||
                            user?.email ||
                            `Member ${index + 1}`;

                        return (
                            <div
                                key={member?._id || user?._id || index}
                                className="flex items-center gap-3 px-5 py-3"
                            >
                                <Avatar className="size-8 shrink-0">
                                    <AvatarImage src={user?.avatar} alt={displayName} />
                                    <AvatarFallback className="bg-dash-violet-500/10 text-[11px] font-semibold text-dash-violet-600">
                                        {displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-800">
                                        {displayName}
                                    </p>
                                    <p className="truncate text-[11px] text-gray-400">
                                        {user?.email || '—'}
                                    </p>
                                </div>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                        member?.role === 'Admin'
                                            ? 'bg-dash-violet-500/10 text-dash-violet-700'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}
                                >
                                    {member?.role || 'Member'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>

            {isAdmin && (
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Invite people
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Share this join code; teammates can use it from the Home page.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                        <span className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 font-mono text-lg font-semibold uppercase tracking-widest text-gray-800">
                            {workspace.joinCode || '—'}
                        </span>
                        <button
                            type="button"
                            onClick={handleCopyJoinCode}
                            disabled={!workspace.joinCode}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:border-dash-violet-300 hover:bg-dash-violet-500/10 hover:text-dash-violet-700 disabled:opacity-50"
                        >
                            <CopyIcon className="size-3.5" />
                            Copy code
                        </button>
                    </div>
                </section>
            )}

            {isAdmin && (
                <section className="overflow-hidden rounded-xl border border-dash-red-200 bg-white shadow-xs">
                    <div className="border-b border-dash-red-100 px-5 py-4">
                        <h3 className="text-sm font-semibold text-dash-red-700">
                            Danger zone
                        </h3>
                        <p className="mt-0.5 text-xs text-gray-400">
                            Deleting a workspace permanently removes its channels and messages.
                        </p>
                    </div>

                    <div className="px-5 py-4">
                        {confirmingDelete ? (
                            <div className="rounded-lg border border-dash-red-200 bg-dash-red-50/50 p-3">
                                <p className="text-sm font-medium text-gray-900">
                                    Delete “{workspace.name}”?
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    This action can&apos;t be undone.
                                </p>
                                <div className="mt-3 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={() => setConfirmingDelete(false)}
                                        className="inline-flex h-8 items-center rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={handleDelete}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-dash-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-dash-red-700 disabled:opacity-50"
                                    >
                                        {isDeleting && (
                                            <Loader className="size-3 animate-spin" />
                                        )}
                                        Delete workspace
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-gray-500">
                                    This action cannot be undone.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setConfirmingDelete(true)}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dash-red-200 px-3 text-xs font-medium text-dash-red-600 transition-colors hover:bg-dash-red-500/10"
                                >
                                    <Trash2Icon className="size-3.5" />
                                    Delete workspace
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}

            <InviteMemberModal />
        </div>
    );
};
