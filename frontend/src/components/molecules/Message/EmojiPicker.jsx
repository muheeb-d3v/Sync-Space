import { cloneElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CheckIcon, SearchIcon, SmilePlusIcon, XIcon } from 'lucide-react';

import {
    EMOJI_CATEGORIES,
    EMOJIS,
    SKIN_TONES,
    applySkinTone,
    getCategoryEmojis,
    getRecentEmojis,
    getSkinTone,
    getSkinToneModifier,
    pushRecentEmoji,
    searchEmojis,
    setSkinTone as persistSkinTone,
} from '@/lib/emojis';

const PANEL_WIDTH = 336;
const GRID_COLUMNS = 8;
const EDGE = 8;
const GAP = 8;

const EMOJI_BY_CHAR = new Map(EMOJIS.map((emoji) => [emoji.char, emoji]));

/**
 * WhatsApp-style emoji picker for the chat composer.
 *
 * Rendered in a portal on `document.body` and anchored to the trigger with a
 * fixed position so the panel is never clipped by the chat layout. Searches by
 * name/keyword, remembers recents, supports skin tones, and keeps the composer
 * focusable while picking (stays open for multiple inserts).
 *
 * Pass `trigger` to render a custom anchor (e.g. the reaction button on a
 * message); otherwise a composer-styled smiley button is rendered.
 */
export const EmojiPicker = ({ onSelect, disabled, trigger, closeOnSelect = false }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('recent');
    const [skinTone, setSkinTone] = useState(() => getSkinTone());
    const [toneOpen, setToneOpen] = useState(false);
    const [recents, setRecents] = useState(() => getRecentEmojis());
    const [activeIndex, setActiveIndex] = useState(0);
    const [panelStyle, setPanelStyle] = useState(null);

    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const searchRef = useRef(null);

    const toneModifier = getSkinToneModifier(skinTone);

    const visibleEmojis = useMemo(() => {
        if (query.trim()) return searchEmojis(query);
        if (category === 'recent') {
            return recents.map((char) => EMOJI_BY_CHAR.get(char)).filter(Boolean);
        }
        return getCategoryEmojis(category);
    }, [query, category, recents]);

    const active = Math.min(activeIndex, Math.max(visibleEmojis.length - 1, 0));

    /* ---------------------------------------------------------------- */
    /* Positioning                                                      */
    /* ---------------------------------------------------------------- */

    const updatePosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const width = Math.min(PANEL_WIDTH, viewportWidth - EDGE * 2);
        const spaceAbove = rect.top - GAP - EDGE;
        const spaceBelow = viewportHeight - rect.bottom - GAP - EDGE;
        const placeAbove = spaceAbove >= 300 || spaceAbove >= spaceBelow;
        const maxHeight = Math.min(420, Math.max(placeAbove ? spaceAbove : spaceBelow, 160));

        let left = rect.left;
        if (left + width > viewportWidth - EDGE) left = viewportWidth - EDGE - width;
        if (left < EDGE) left = EDGE;

        setPanelStyle({
            left,
            width,
            maxHeight,
            ...(placeAbove
                ? { bottom: viewportHeight - rect.top + GAP }
                : { top: rect.bottom + GAP }),
        });
    }, []);

    useLayoutEffect(() => {
        if (open) updatePosition();
    }, [open, updatePosition]);

    useEffect(() => {
        if (!open) return;

        const reposition = () => updatePosition();
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
        };
    }, [open, updatePosition]);

    /* ---------------------------------------------------------------- */
    /* Open / close / focus                                             */
    /* ---------------------------------------------------------------- */

    const close = useCallback(() => {
        setOpen(false);
        setToneOpen(false);
        triggerRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event) => {
            if (panelRef.current?.contains(event.target)) return;
            if (triggerRef.current?.contains(event.target)) return;
            setOpen(false);
            setToneOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            close();
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, close]);

    useEffect(() => {
        if (!open) return;
        const frame = requestAnimationFrame(() => searchRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open]);

    function openPicker() {
        const storedRecents = getRecentEmojis();
        setRecents(storedRecents);
        setSkinTone(getSkinTone());
        setQuery('');
        setCategory(storedRecents.length > 0 ? 'recent' : 'smileys');
        setActiveIndex(0);
        setToneOpen(false);
        setOpen(true);
    }

    function togglePicker() {
        if (open) close();
        else openPicker();
    }

    function resetView(nextCategory) {
        setCategory(nextCategory);
        setQuery('');
        setActiveIndex(0);
    }

    function handleSelect(emoji) {
        onSelect?.(applySkinTone(emoji.char, toneModifier));
        setRecents(pushRecentEmoji(emoji.char));
        if (closeOnSelect) close();
    }

    function handleToneChange(toneId) {
        setSkinTone(toneId);
        persistSkinTone(toneId);
        setToneOpen(false);
        searchRef.current?.focus();
    }

    /* ---------------------------------------------------------------- */
    /* Keyboard navigation inside the grid                              */
    /* ---------------------------------------------------------------- */

    function focusEmoji(index) {
        setActiveIndex(index);
        requestAnimationFrame(() => {
            panelRef.current
                ?.querySelector(`[data-emoji-index="${index}"]`)
                ?.focus();
        });
    }

    function handleGridKeyDown(event) {
        const last = visibleEmojis.length - 1;
        if (last < 0) return;

        let next = active;
        switch (event.key) {
            case 'ArrowRight':
                next = Math.min(active + 1, last);
                break;
            case 'ArrowLeft':
                next = Math.max(active - 1, 0);
                break;
            case 'ArrowDown':
                next = Math.min(active + GRID_COLUMNS, last);
                break;
            case 'ArrowUp':
                next = Math.max(active - GRID_COLUMNS, 0);
                break;
            case 'Home':
                next = 0;
                break;
            case 'End':
                next = last;
                break;
            default:
                return;
        }

        event.preventDefault();
        focusEmoji(next);
    }

    function handleSearchKeyDown(event) {
        if (event.key === 'ArrowDown' && visibleEmojis.length > 0) {
            event.preventDefault();
            focusEmoji(0);
        }
    }

    /* ---------------------------------------------------------------- */
    /* Render                                                           */
    /* ---------------------------------------------------------------- */

    const activeCategory = EMOJI_CATEGORIES.find((item) => item.id === category);
    const heading = query.trim()
        ? `Search results for “${query.trim()}”`
        : category === 'recent'
          ? 'Recently used'
          : activeCategory?.label;

    return (
        <>
            {trigger ? (
                cloneElement(trigger, {
                    ref: triggerRef,
                    onClick: togglePicker,
                    'aria-expanded': open,
                    'aria-haspopup': 'dialog',
                })
            ) : (
                <button
                    ref={triggerRef}
                    type="button"
                    disabled={disabled}
                    onClick={togglePicker}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-200 hover:text-dash-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Open emoji picker"
                    aria-expanded={open}
                    aria-haspopup="dialog"
                >
                    <SmilePlusIcon className="size-4" />
                </button>
            )}

            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="dialog"
                        aria-label="Emoji picker"
                        className="fixed z-[80] flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
                        style={{
                            ...(panelStyle ?? {
                                left: EDGE,
                                width: Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2),
                                maxHeight: 320,
                                top: 0,
                            }),
                            visibility: panelStyle ? 'visible' : 'hidden',
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                close();
                            }
                        }}
                    >
                        {/* Search + skin tone */}
                        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-2">
                            <SearchIcon className="size-4 shrink-0 text-gray-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                    setActiveIndex(0);
                                }}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search emoji"
                                aria-label="Search emoji"
                                className="min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery('');
                                        setActiveIndex(0);
                                        searchRef.current?.focus();
                                    }}
                                    className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600"
                                    aria-label="Clear emoji search"
                                >
                                    <XIcon className="size-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Emoji grid */}
                        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
                            <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                {heading}
                            </p>

                            {visibleEmojis.length === 0 ? (
                                <p className="px-1 py-6 text-center text-xs text-gray-500">
                                    {query.trim()
                                        ? `No emoji found for “${query.trim()}”.`
                                        : 'No emoji here yet — pick one and it will show up.'}
                                </p>
                            ) : (
                                <div
                                    className="grid grid-cols-8 gap-0.5"
                                    onKeyDown={handleGridKeyDown}
                                >
                                    {visibleEmojis.map((emoji, index) => {
                                        const char = applySkinTone(emoji.char, toneModifier);
                                        return (
                                            <button
                                                key={`${emoji.char}-${index}`}
                                                type="button"
                                                data-emoji-index={index}
                                                tabIndex={index === active ? 0 : -1}
                                                onFocus={() => setActiveIndex(index)}
                                                onClick={() => handleSelect(emoji)}
                                                title={emoji.name}
                                                aria-label={emoji.name}
                                                className="flex size-8 items-center justify-center rounded-lg text-xl leading-none transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:bg-dash-violet-500/10 focus-visible:ring-2 focus-visible:ring-dash-violet-500/40"
                                            >
                                                <span aria-hidden="true">{char}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Skin tone swatches */}
                        {toneOpen && (
                            <div className="absolute inset-x-2 bottom-12 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
                                <div className="flex items-center justify-between gap-1">
                                    {SKIN_TONES.map((tone) => (
                                        <button
                                            key={tone.id}
                                            type="button"
                                            onClick={() => handleToneChange(tone.id)}
                                            title={`${tone.label} skin tone`}
                                            aria-label={`${tone.label} skin tone`}
                                            aria-pressed={skinTone === tone.id}
                                            className={`relative flex size-9 items-center justify-center rounded-lg text-xl leading-none transition-colors hover:bg-gray-100 ${
                                                skinTone === tone.id
                                                    ? 'bg-dash-violet-500/10 ring-1 ring-dash-violet-500/40'
                                                    : ''
                                            }`}
                                        >
                                            <span aria-hidden="true">
                                                {applySkinTone('✋', tone.modifier)}
                                            </span>
                                            {skinTone === tone.id && (
                                                <CheckIcon className="absolute right-0.5 bottom-0.5 size-2.5 text-dash-violet-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Category tabs + tone toggle */}
                        <div className="flex shrink-0 items-center gap-1 border-t border-gray-100 px-2 py-1.5">
                            <div
                                className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto"
                                role="tablist"
                                aria-label="Emoji categories"
                            >
                                {EMOJI_CATEGORIES.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={!query.trim() && category === item.id}
                                        onClick={() => resetView(item.id)}
                                        title={item.label}
                                        aria-label={item.label}
                                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-base leading-none transition-colors hover:bg-gray-100 ${
                                            !query.trim() && category === item.id
                                                ? 'bg-dash-violet-500/10 text-dash-violet-600 ring-1 ring-dash-violet-500/30'
                                                : ''
                                        }`}
                                    >
                                        <span aria-hidden="true">{item.icon}</span>
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setToneOpen((value) => !value)}
                                className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-base leading-none transition-colors hover:bg-gray-100 ${
                                    toneOpen
                                        ? 'bg-dash-violet-500/10 ring-1 ring-dash-violet-500/30'
                                        : ''
                                }`}
                                title="Skin tone"
                                aria-label="Choose skin tone"
                                aria-expanded={toneOpen}
                            >
                                <span aria-hidden="true">
                                    {applySkinTone('✋', toneModifier)}
                                </span>
                            </button>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};
