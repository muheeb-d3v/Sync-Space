import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { ChevronDownIcon, EditIcon, ListFilterIcon, SettingsIcon, UserPlusIcon } from 'lucide-react';

import { useAuth } from '@/hooks/context/useAuth';
import { useInviteMemberModal } from '@/hooks/context/useInviteMemberModal';
import { useWorkspacePreferenceModal } from '@/hooks/context/useWorkspacePreferenceModal';

export const WorkspacePanelHeader = ({ workspace }) => {
    const workspaceMembers = workspace?.members;
    const { auth } = useAuth();
    const currentUserId = auth?.user?._id || auth?.user?.id;
    const isLoggedInUserAdminOfWorkspace = workspaceMembers?.find((member) => {
        const memberIdStr = String(member?.memberId?._id ?? member?.memberId);
        return memberIdStr === currentUserId && member.role === 'Admin';
    });

    const { setOpenPreferences, setInitialValue } = useWorkspacePreferenceModal();
    const { setOpenInviteMemberModal } = useInviteMemberModal();

    const workspaceInitial = workspace?.name?.charAt(0).toUpperCase() || 'W';

    return (
        <div className="flex h-14 shrink-0 items-center justify-between gap-1 border-b border-gray-200 px-2.5">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="group flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/30"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-dash-violet-500 to-dash-violet-700 text-sm font-semibold text-white shadow-xs">
                            {workspaceInitial}
                        </span>
                        <span className="truncate text-sm font-semibold text-gray-900">
                            {workspace?.name}
                        </span>
                        <ChevronDownIcon className="size-4 shrink-0 text-gray-400 transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="start"
                    sideOffset={6}
                    className="z-50 w-64 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
                >
                    <DropdownMenuItem
                        onSelect={(event) => event.preventDefault()}
                        className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-2 py-2 outline-none"
                    >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-dash-violet-500 to-dash-violet-700 text-sm font-semibold text-white">
                            {workspaceInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                                {workspace?.name}
                            </p>
                            <p className="text-[11px] text-gray-500">Active workspace</p>
                        </div>
                    </DropdownMenuItem>

                    {isLoggedInUserAdminOfWorkspace && (
                        <>
                            <DropdownMenuSeparator className="my-1.5 h-px bg-gray-100" />
                            <DropdownMenuItem
                                onSelect={() => {
                                    setInitialValue(workspace?.name || '');
                                    setOpenPreferences(true);
                                }}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 outline-none transition-colors focus:bg-gray-50"
                            >
                                <SettingsIcon className="size-4 text-gray-400" />
                                Preferences
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() => setOpenInviteMemberModal(true)}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-700 outline-none transition-colors focus:bg-gray-50"
                            >
                                <UserPlusIcon className="size-4 text-gray-400" />
                                <span className="truncate">
                                    Invite member to {workspace?.name}
                                </span>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex shrink-0 items-center gap-0.5">
                <button
                    type="button"
                    aria-label="Filter channels"
                    className="inline-flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                    <ListFilterIcon className="size-4" />
                </button>
                <button
                    type="button"
                    aria-label="Edit workspace"
                    className="inline-flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                    <EditIcon className="size-4" />
                </button>
            </div>
        </div>
    );
};
