import { useRef } from 'react';

import { ImageIcon, FileTextIcon, UploadIcon, PlusIcon, XIcon } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FILE_CATEGORIES = [
    {
        id: 'photos-videos',
        label: 'Photos & Videos',
        description: 'Images and video files',
        icon: <ImageIcon className="size-5" />,
        accept: 'image/*,video/*',
    },
    {
        id: 'documents',
        label: 'Documents',
        description: 'PDF, Word, Excel, PowerPoint, text',
        icon: <FileTextIcon className="size-5" />,
        accept: '.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx',
    },
    {
        id: 'any-file',
        label: 'Any Supported File',
        description: 'All permitted file types',
        icon: <UploadIcon className="size-5" />,
        accept: 'image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.zip',
    },
];

/**
 * Attachment picker in the chat composer.
 *
 * Uses the project's Radix `DropdownMenu` so the popup renders in a portal on
 * `document.body`: it escapes clipping/stacking contexts of the chat layout,
 * is collision-aware (stays inside the viewport), and gets outside-click and
 * Escape handling for free.
 */
export const AttachmentMenu = ({ onSelectFiles, disabled }) => {
    const fileInputRef = useRef(null);

    function pickFiles(accept) {
        const input = fileInputRef.current;
        if (!input) return;

        // Reset so selecting the same file again still fires `change`.
        input.value = '';
        input.accept = accept;
        input.click();
    }

    function handleFileChange(e) {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) onSelectFiles(files);
        e.target.value = '';
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-dash-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Attach files"
                >
                    <PlusIcon className="size-4" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                collisionPadding={8}
                className="w-64 rounded-xl border-gray-200 bg-white p-2 shadow-xl"
                aria-label="Attachment options"
            >
                {FILE_CATEGORIES.map((category) => (
                    <DropdownMenuItem
                        key={category.id}
                        disabled={disabled}
                        onSelect={() => pickFiles(category.accept)}
                        className="cursor-pointer gap-3 rounded-lg px-3 py-2 text-gray-700 focus:bg-gray-100 focus:text-dash-violet-600 [&_svg]:size-5"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-600">
                            {category.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium leading-none">
                                {category.label}
                            </span>
                            <span className="mt-1 block text-[10px] leading-none text-gray-500">
                                {category.description}
                            </span>
                        </span>
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="my-1 bg-gray-100" />

                <DropdownMenuItem
                    onSelect={() => {}}
                    className="cursor-pointer gap-3 rounded-lg px-3 py-2 text-dash-red-600 focus:bg-dash-red-500/10 focus:text-dash-red-600"
                >
                    <XIcon className="size-4" />
                    <span>Cancel</span>
                </DropdownMenuItem>
            </DropdownMenuContent>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={handleFileChange}
            />
        </DropdownMenu>
    );
};
