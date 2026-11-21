import { LogOutIcon, PencilIcon, SettingsIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/context/useAuth';
import { useCreateWorkspaceModal } from '@/hooks/context/useCreateWorkspaceModal';
import { useToast } from '@/hooks/use-toast';

export const UserButton = () => {
    const navigate = useNavigate();
    const { workspaceId } = useParams();
    const { auth, logout } = useAuth();
    const { setOpenCreateWorkspaceModal } = useCreateWorkspaceModal();
    const { toast } = useToast();

    function handleCreateWorkspace() {
        setOpenCreateWorkspaceModal(true);
    }

    async function handleLogout() {
        await logout();
        toast({
            title: 'logged out successfully',
            message: 'You will be redirected to the login page in a few seconds',
            type: 'success',
        });
        navigate('/auth/signin');
    }

    const initials = auth?.user?.username
        ?.split('')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label="Open user menu"
                className="relative rounded-xl outline-none"
            >
                <Avatar className="size-9 rounded-xl shadow-xs ring-1 ring-gray-200 transition hover:ring-dash-violet-300">
                    <AvatarImage src={auth?.user?.avatar} alt={auth?.user?.username} />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-dash-violet-500 to-dash-violet-700 text-[11px] font-semibold text-white">
                        {initials}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                className="w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
            >
                <DropdownMenuItem
                    onClick={handleCreateWorkspace}
                    className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-700 focus:bg-gray-50"
                >
                    <PencilIcon className="size-4 text-gray-400" />
                    Create workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() =>
                        workspaceId
                            ? navigate(`/workspaces/${workspaceId}/settings`)
                            : navigate('/home')
                    }
                    className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-700 focus:bg-gray-50"
                >
                    <SettingsIcon className="size-4 text-gray-400" />
                    Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-sm text-dash-red-600 focus:bg-dash-red-500/10 focus:text-dash-red-600"
                >
                    <LogOutIcon className="size-4" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
