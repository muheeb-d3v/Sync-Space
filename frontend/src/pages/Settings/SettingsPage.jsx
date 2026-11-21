import { SettingsIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { ProfileSettings } from '@/components/organisms/Settings/ProfileSettings';
import { WorkspaceSettings } from '@/components/organisms/Settings/WorkspaceSettings';

const TABS = [
    { key: 'profile', label: 'Profile' },
    { key: 'workspace', label: 'Workspace' }
];

export const SettingsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const section = searchParams.get('section') === 'workspace'
        ? 'workspace'
        : 'profile';

    function selectSection(nextSection) {
        if (nextSection === 'profile') {
            setSearchParams({});
        } else {
            setSearchParams({ section: nextSection });
        }
    }

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-4 lg:px-6">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500/10 text-dash-violet-600">
                    <SettingsIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-gray-900">
                        Settings
                    </h2>
                    <p className="truncate text-[11px] text-gray-400">
                        Manage your profile and workspace preferences.
                    </p>
                </div>
            </header>

            {/* On phones the settings panel lives in the drawer. */}
            <div className="flex shrink-0 gap-1.5 border-b border-gray-200 px-3 py-2 md:hidden">
                {TABS.map(({ key, label }) => (
                    <button
                        type="button"
                        key={key}
                        onClick={() => selectSection(key)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            section === key
                                ? 'bg-dash-violet-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="ws-scroll flex-1 overflow-y-auto px-4 py-5 lg:px-6">
                <div className="mx-auto max-w-3xl">
                    {section === 'profile' ? (
                        <ProfileSettings />
                    ) : (
                        <WorkspaceSettings />
                    )}
                </div>
            </div>
        </div>
    );
};
