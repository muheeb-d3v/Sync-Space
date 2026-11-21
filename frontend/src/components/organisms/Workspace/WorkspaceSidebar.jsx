import { BellIcon, HomeIcon, MessageSquareIcon, MoreHorizontalIcon } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { UserButton } from '@/components/atoms/UserButton/UserButton';
import { SidebarButton } from '@/components/molecules/SidebarButton/SidebarButton';
import { useGetUnreadNotificationsCount } from '@/hooks/apis/notifications/useGetUnreadNotificationsCount';

import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export const WorkspaceSidebar = () => {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { workspaceId } = useParams();
    const { unreadCount } = useGetUnreadNotificationsCount();

    const isDmsRoute = pathname.includes('/dms');
    const isNotificationsRoute = pathname.includes('/notifications');
    const isSettingsRoute = pathname.includes('/settings');

    return (
        <aside className="flex h-full w-[72px] shrink-0 flex-col items-center gap-1 border-r border-gray-200 bg-white py-3">
            <WorkspaceSwitcher />

            <div className="my-2 h-px w-9 bg-gray-200" />

            <nav className="flex w-full flex-col items-center gap-1">
                <SidebarButton
                    Icon={HomeIcon}
                    label="Home"
                    active={!isDmsRoute && !isNotificationsRoute && !isSettingsRoute}
                    onClick={() => navigate('/home')}
                />

                <SidebarButton
                    Icon={MessageSquareIcon}
                    label="DMs"
                    active={isDmsRoute}
                    onClick={() =>
                        workspaceId
                            ? navigate(`/workspaces/${workspaceId}/dms`)
                            : navigate('/home')
                    }
                />

                <SidebarButton
                    Icon={BellIcon}
                    label="Notifications"
                    active={isNotificationsRoute}
                    badge={unreadCount}
                    onClick={() =>
                        workspaceId
                            ? navigate(`/workspaces/${workspaceId}/notifications`)
                            : navigate('/home')
                    }
                />

                <SidebarButton
                    Icon={MoreHorizontalIcon}
                    label="More"
                />
            </nav>

            <div className="mt-auto flex flex-col items-center gap-y-2 pb-1">
                <UserButton />
            </div>
        </aside>
    );
};
