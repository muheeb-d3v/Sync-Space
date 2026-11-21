export const SidebarButton = ({ Icon, label, onClick, active = false, badge = 0 }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`group flex w-full flex-col items-center gap-0.5 rounded-lg py-1 transition-colors ${
                onClick ? 'cursor-pointer' : 'cursor-default'
            }`}
        >
            <span
                className={`relative flex size-9 items-center justify-center rounded-lg transition-colors ${
                    active
                        ? 'bg-dash-violet-500/10 text-dash-violet-600'
                        : 'text-gray-400 group-hover:bg-gray-100 group-hover:text-dash-violet-600'
                }`}
            >
                <Icon className="size-[18px]" />
                {badge > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-dash-violet-500 px-1 text-[9px] font-semibold leading-none text-white">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </span>
            <span
                className={`text-[10px] font-medium leading-4 transition-colors ${
                    active
                        ? 'text-dash-violet-600'
                        : 'text-gray-500 group-hover:text-dash-violet-600'
                }`}
            >
                {label}
            </span>
        </button>
    );
};
