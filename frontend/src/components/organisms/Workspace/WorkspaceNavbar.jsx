import { InfoIcon, LucideLoader2, MenuIcon, SearchIcon } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useGetWorkspaceById } from '@/hooks/apis/workspaces/useGetWorkspaceById';

export const WorkspaceNavbar = ({ onOpenChannels }) => {
    const { workspaceId } = useParams();
    const { isLoading, workspace } = useGetWorkspaceById(workspaceId);

    const workspaceName = workspace?.name || 'Workspace';
    const workspaceInitial = workspaceName.charAt(0).toUpperCase();

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 sm:px-4 lg:px-6">
            {/* Mobile: open the channels drawer */}
            <button
                type="button"
                onClick={onOpenChannels}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 md:hidden"
                aria-label="Open channels"
            >
                <MenuIcon className="size-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-dash-violet-500/10 text-xs font-semibold text-dash-violet-600">
                    {isLoading ? (
                        <LucideLoader2 className="size-4 animate-spin" />
                    ) : (
                        workspaceInitial
                    )}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                        {workspaceName}
                    </p>
                    <p className="hidden text-[11px] text-gray-400 sm:block">
                        Workspace
                    </p>
                </div>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
                <button
                    type="button"
                    className="hidden h-9 w-auto max-w-[240px] items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-400 transition-colors hover:border-gray-300 hover:bg-white hover:text-gray-600 sm:flex"
                >
                    <SearchIcon className="size-4 shrink-0" />
                    <span className="truncate">Search {workspaceName}</span>
                </button>

                <button
                    type="button"
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Workspace info"
                >
                    <InfoIcon className="size-5" />
                </button>
            </div>
        </header>
    );
};
