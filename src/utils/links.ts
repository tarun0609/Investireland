import type React from 'react';

/** True when the user wants the browser's default link behaviour (new tab/window, download). */
export const isModifiedClick = (e: React.MouseEvent) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
