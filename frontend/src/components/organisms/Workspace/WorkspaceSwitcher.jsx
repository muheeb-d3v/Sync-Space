import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { CheckIcon, Loader } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useFetchWorkspace } from '@/hooks/apis/workspaces/useFetchWorkspace';
import { useGetWorkspaceById } from '@/hooks/apis/workspaces/useGetWorkspaceById';

export const WorkspaceSwitcher = () => {
    const navigate = useNavigate();
    const { workspaceId } = useParams();
    const { isFetching, workspace } = useGetWorkspaceById(workspaceId);
    const { isFetching: isFetchingWorkspaces, workspaces } = useFetchWorkspace();

    const otherWorkspaces = (workspaces ?? []).filter(
        (item) => item._id !== workspaceId
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="Switch workspace"
                    className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-dash-violet-500 to-dash-violet-700 text-lg font-semibold text-white shadow-xs transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-violet-500/40"
                >
                    {isFetching ? (
                        <Loader className="size-5 animate-spin" />
                    ) : (
                        workspace?.name?.charAt(0).toUpperCase() || 'W'
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="start"
                sideOffset={10}
                className="z-50 w-64 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
            >
                <DropdownMenuLabel className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Your workspaces
                </DropdownMenuLabel>

                <div className="flex items-center gap-2.5 rounded-lg bg-dash-violet-500/10 px-2 py-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500 text-xs font-semibold text-white">
                        {workspace?.name?.charAt(0).toUpperCase() || 'W'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                            {workspace?.name || 'Workspace'}
                        </p>
                        <p className="text-[11px] text-gray-500">Active workspace</p>
                    </div>
                    <CheckIcon className="size-4 shrink-0 text-dash-violet-600" />
                </div>

                {isFetchingWorkspaces ? (
                    <div className="flex items-center justify-center py-2.5">
                        <Loader className="size-4 animate-spin text-gray-400" />
                    </div>
                ) : otherWorkspaces.length > 0 ? (
                    <>
                        <DropdownMenuSeparator className="my-1.5 h-px bg-gray-100" />
                        {otherWorkspaces.map((item) => (
                            <DropdownMenuItem
                                key={item._id}
                                onSelect={() => navigate(`/workspaces/${item._id}`)}
                                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 outline-none transition-colors focus:bg-gray-50"
                            >
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                                    {item.name?.charAt(0).toUpperCase() || 'W'}
                                </div>
                                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                                    {item.name}
                                </span>
                            </DropdownMenuItem>
                        ))}
                    </>
                ) : (
                    <p className="px-2 py-2 text-[11px] text-gray-400">
                        No other workspaces yet.
                    </p>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
