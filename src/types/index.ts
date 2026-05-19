import { EventRef } from 'obsidian';

export interface ColorFolderSettings {
    styles: {
        [path: string]: StyleSettings
    };
    presets: {
        [name: string]: StyleSettings
    };
    presetOrder: string[];
    tagTextColor?: string;
    tagBackgroundColors?: {
        [tag: string]: string;
    };
}

export interface StyleSettings {
    backgroundColorEnabled?: boolean;
    backgroundColor?: string;
    borderColorEnabled?: boolean;
    borderColor?: string;
    textColor?: string;
    isBold?: boolean;
    isItalic?: boolean;
    fileTextColor?: string;
    fileIsBold?: boolean;
    fileIsItalic?: boolean;
    opacity?: number;
    applyToSubfolders?: boolean;
    applyToFiles?: boolean;
    rainbowFileNames?: boolean;
}

export interface ColorFolderPluginInterface {
    settings: ColorFolderSettings;
    manifest: {
        version: string;
    };
    saveSettings(): Promise<void>;
    updateStyles(): void;
    confirmOverwritePreset(name: string): Promise<boolean>;
    registerEvent(event: EventRef): void;
}
