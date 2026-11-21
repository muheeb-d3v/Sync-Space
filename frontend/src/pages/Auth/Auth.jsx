import { Chip } from '@heroui/react';
import { BellIcon, HashIcon, MessageSquareIcon, MessagesSquareIcon } from 'lucide-react';

import '@/css/auth.css';

const FEATURES = [
    {
        Icon: HashIcon,
        title: 'Channels with context',
        description: 'Projects, decisions, and history stay in one focused place.'
    },
    {
        Icon: MessageSquareIcon,
        title: 'Direct conversations',
        description: 'Private threads for the work that needs a smaller room.'
    },
    {
        Icon: BellIcon,
        title: 'Signal, not noise',
        description: 'Mentions and messages surface when they matter to you.'
    }
];

function BrandMark({ className = 'size-9' }) {
    return (
        <span
            className={`relative flex ${className} shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-dash-violet-400 via-dash-violet-500 to-dash-violet-700 shadow-lg shadow-dash-violet-950/30`}
        >
            <MessagesSquareIcon className="size-[52%] text-white" strokeWidth={2.2} />
        </span>
    );
}

export const Auth = ({ children }) => {
    return (
        <div className="auth-page flex min-h-screen w-full font-inter text-gray-900">
            <aside className="auth-brand-panel relative hidden w-[46%] max-w-[700px] flex-col overflow-hidden px-10 py-10 text-white lg:flex xl:px-14">
                <div className="auth-brand-glow pointer-events-none absolute inset-0" aria-hidden="true" />
                <div className="auth-brand-grid pointer-events-none absolute inset-0" aria-hidden="true" />

                <div className="relative flex items-center gap-3">
                    <BrandMark />
                    <div>
                        <p className="text-[15px] font-semibold tracking-[-0.01em]">
                            SyncSpace
                        </p>
                        <p className="text-[11px] text-white/50">Workspace chat</p>
                    </div>
                </div>

                <div className="relative my-auto max-w-[450px] py-10">
                    <Chip
                        size="sm"
                        variant="flat"
                        className="border border-white/10 bg-white/[0.06] px-2.5 text-[11px] font-medium text-white/65"
                    >
                        Built for focused teams
                    </Chip>

                    <h1 className="mt-6 text-[40px] font-semibold leading-[1.08] tracking-[-0.035em] text-white xl:text-[46px]">
                        Make work feel
                        <br />
                        like a conversation.
                    </h1>

                    <p className="mt-5 max-w-[390px] text-[14px] leading-7 text-white/60">
                        Channels, direct messages, and workspace context in one
                        calm, fast place — so your team can move together
                        without the noise.
                    </p>

                    <ul className="mt-9 space-y-4">
                        {FEATURES.map(({ Icon, title, description }) => (
                            <li key={title} className="flex gap-3">
                                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/65">
                                    <Icon className="size-4" />
                                </span>
                                <div>
                                    <p className="text-[13px] font-medium text-white/85">
                                        {title}
                                    </p>
                                    <p className="mt-0.5 max-w-[320px] text-[11.5px] leading-5 text-white/50">
                                        {description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative flex items-center gap-2 text-[11px] text-white/50">
                    <span className="size-1.5 rounded-full bg-emerald-400/80" />
                    Real-time messaging · Session-protected
                </div>
            </aside>

            <main className="flex min-h-screen flex-1 flex-col">
                <header className="flex items-center gap-2.5 px-5 pt-6 sm:px-8 lg:hidden">
                    <BrandMark className="size-8" />
                    <span className="text-sm font-semibold tracking-[-0.01em]">
                        SyncSpace
                    </span>
                </header>

                <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
                    <div className="w-full max-w-[420px]">{children}</div>
                </div>

                <p className="pb-6 text-center text-[11px] text-gray-500">
                    Real-time messaging for focused teams
                </p>
            </main>
        </div>
    );
};
