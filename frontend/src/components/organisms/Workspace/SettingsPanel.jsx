import { Building2Icon, SettingsIcon, UserIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '@/hooks/context/useAuth';

const SECTIONS = [
    {
        key: 'profile',
        label: 'Profile',
        description: 'Name, email and avatar',
        Icon: UserIcon
    },
    {
        key: 'workspace',
        label: 'Workspace',
        description: 'Details, members and danger zone',
        Icon: Building2Icon
    }
];

export const SettingsPanel = ({ onNavigate }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { auth } = useAuth();

    const activeSection = searchParams.get('section') === 'workspace'
        ? 'workspace'
        : 'profile';

    function selectSection(section) {
        if (section === 'profile') {
            setSearchParams({});
        } else {
            setSearchParams({ section });
        }
        onNavigate?.();
    }

    return (
        <div
            data-settings-panel="true"
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs"
        >
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-dash-violet-500/10 text-dash-violet-600">
                    <SettingsIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">Settings</p>
                    <p className="text-[11px] text-gray-400">Account &amp; workspace</p>
                </div>
            </div>

            <div className="ws-scroll flex-1 overflow-y-auto px-2 py-2">
                <nav className="space-y-0.5">
                    {SECTIONS.map(({ key, label, description, Icon }) => {
                        const isActive = activeSection === key;

                        return (
                            <button
                                type="button"
                                key={key}
                                onClick={() => selectSection(key)}
                                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors ${
                                    isActive
                                        ? 'bg-dash-violet-500/10'
                                        : 'hover:bg-gray-100'
                                }`}
                            >
                                <span
                                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                                        isActive
                                            ? 'bg-dash-violet-500/15 text-dash-violet-600'
                                            : 'bg-gray-100 text-gray-400'
                                    }`}
                                >
                                    <Icon className="size-3.5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={`block truncate text-[13px] ${
                                            isActive
                                                ? 'font-medium text-dash-violet-700'
                                                : 'font-medium text-gray-700'
                                        }`}
                                    >
                                        {label}
                                    </span>
                                    <span className="block truncate text-[11px] text-gray-400">
                                        {description}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="shrink-0 border-t border-gray-200 px-3 py-2.5">
                <p className="truncate text-[11px] text-gray-400">
                    Signed in as{' '}
                    <span className="font-medium text-gray-600">
                        {auth?.user?.username || 'your account'}
                    </span>
                </p>
            </div>
        </div>
    );
};
