import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/molecules/ProtectedRoute/ProtectedRoute';
import { SigninContainer } from '@/components/organisms/Auth/SignInContainer';
import { SignUpContainer } from '@/components/organisms/Auth/SignUpContainer';
import { Auth } from '@/pages/Auth/Auth';
import { ChannelPage } from '@/pages/Channel/ChannelPage';
import { Notfound } from '@/pages/Notfound/Notfound';

import Home from './pages/home/Home';
import { DmsPage } from './pages/Dms/DmsPage';
import { NotificationsPage } from './pages/Notifications/NotificationsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { WorkspaceLayout } from './pages/Workspace/Layout';

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/auth/signup" element={<Auth><SignUpContainer /></Auth>} />

            <Route path="/auth/signin" element={<Auth><SigninContainer /></Auth>} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/workspaces/:workspaceId" element={<ProtectedRoute><WorkspaceLayout/></ProtectedRoute>} />
            <Route path="/workspaces/:workspaceId/dms" element={<ProtectedRoute><WorkspaceLayout><DmsPage /></WorkspaceLayout></ProtectedRoute>} />
            <Route path="/workspaces/:workspaceId/dms/:channelId" element={<ProtectedRoute><WorkspaceLayout><ChannelPage variant="dm" /></WorkspaceLayout></ProtectedRoute>} />
            <Route path="/workspaces/:workspaceId/notifications" element={<ProtectedRoute><WorkspaceLayout><NotificationsPage /></WorkspaceLayout></ProtectedRoute>} />
            <Route path="/workspaces/:workspaceId/settings" element={<ProtectedRoute><WorkspaceLayout><SettingsPage /></WorkspaceLayout></ProtectedRoute>} />
            <Route path="/workspaces/:workspaceId/channels/:channelId" element={<ProtectedRoute><WorkspaceLayout><ChannelPage /></WorkspaceLayout></ProtectedRoute>} />
            <Route path="/*" element={<Notfound />} />
        </Routes>
    );
};
