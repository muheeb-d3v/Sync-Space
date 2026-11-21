import { useState } from 'react';

import { WorkspaceNavbar } from '@/components/organisms/Workspace/WorkspaceNavbar';
import { WorkspacePanel } from '@/components/organisms/Workspace/WorkspacePanel';
import { WorkspaceSidebar } from '@/components/organisms/Workspace/WorkspaceSidebar';

import '@/css/workspace.css';

export const WorkspaceLayout = ({ children }) => {
    const [isChannelsOpen, setIsChannelsOpen] = useState(false);

    return (
        <div className="flex h-screen w-full overflow-hidden bg-gray-100 font-inter text-gray-600 antialiased">
            <WorkspaceSidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                <WorkspaceNavbar onOpenChannels={() => setIsChannelsOpen(true)} />

                <div className="flex min-h-0 flex-1 gap-3 p-2 sm:p-3 lg:gap-4 lg:p-4">
                    {/* Mobile backdrop for the channels drawer */}
                    {isChannelsOpen && (
                        <button
                            type="button"
                            aria-label="Close channels"
                            onClick={() => setIsChannelsOpen(false)}
                            className="fixed inset-0 z-40 cursor-default bg-gray-900/40 backdrop-blur-[1px] md:hidden"
                        />
                    )}

                    {/*
                        One single WorkspacePanel instance: a static card on desktop,
                        a slide-in drawer on mobile. This keeps channel state, modals
                        and data fetching exactly where they were.
                    */}
                    <div
                        className={
                            (isChannelsOpen
                                ? 'fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw] p-2 '
                                : 'hidden ') +
                            'md:static md:z-auto md:block md:w-[270px] md:max-w-none md:shrink-0 md:p-0 xl:w-[310px]'
                        }
                    >
                        <WorkspacePanel onNavigate={() => setIsChannelsOpen(false)} />
                    </div>

                    <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
};
