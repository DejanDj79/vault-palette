import { StyleSettings } from '../types';
import { adjustOpacity } from './colorUtils';

export function isBackgroundEnabled(style: StyleSettings): boolean {
    return Boolean(style.backgroundColor && (style.backgroundColorEnabled ?? true));
}

export function getStyleBackgroundColor(style: StyleSettings, opacity = style.opacity): string | null {
    if (!isBackgroundEnabled(style)) {
        return null;
    }

    if (typeof opacity !== 'number') {
        return style.backgroundColor || null;
    }

    try {
        return adjustOpacity(style.backgroundColor || '', opacity);
    } catch (e) {
        console.error('Invalid background color:', style.backgroundColor, e);
        return style.backgroundColor || null;
    }
}

export function getStyleHoverOpacity(style: StyleSettings): number | undefined {
    if (typeof style.opacity !== 'number') {
        return undefined;
    }

    return Math.min(1, style.opacity + 0.15);
}

export function isBorderEnabled(style: StyleSettings): boolean {
    return Boolean(style.borderColor && (style.borderColorEnabled ?? true));
}

export function getStyleBorderColor(style: StyleSettings): string | null {
    return isBorderEnabled(style) ? style.borderColor || null : null;
}

export function hasChildFileTextStyle(style: StyleSettings): boolean {
    return typeof style.fileTextColor === 'string'
        || typeof style.fileIsBold === 'boolean'
        || typeof style.fileIsItalic === 'boolean';
}

export function getChildFileTextStyle(style: StyleSettings): StyleSettings {
    const hasFileTextStyle = hasChildFileTextStyle(style);

    return {
        textColor: hasFileTextStyle ? style.fileTextColor : style.textColor,
        isBold: hasFileTextStyle ? Boolean(style.fileIsBold) : Boolean(style.isBold),
        isItalic: hasFileTextStyle ? Boolean(style.fileIsItalic) : Boolean(style.isItalic)
    };
}
