import { App, Modal, Setting, Notice, TextComponent, ColorComponent, ToggleComponent, SliderComponent, TFile, TFolder } from 'obsidian';
import { StyleSettings, ColorFolderPluginInterface } from '../types';
import { DEFAULT_STYLE } from '../constants';
import { getChildFileTextStyle, getStyleBackgroundColor, getStyleBorderColor, getStyleHoverOpacity, isBackgroundEnabled, isBorderEnabled } from '../utils/styleUtils';

export class ColorSettingsModal extends Modal {
    private style: StyleSettings;
    private previewEl: HTMLElement;
    private filePreviewEl: HTMLElement;
    private readonly previewPath: string;
    private styleEl: HTMLStyleElement;
    // Store control references
    private bgToggle: ToggleComponent;
    private bgColorPicker: ColorComponent;
    private borderToggle: ToggleComponent;
    private borderColorPicker: ColorComponent;
    private textColorPicker: ColorComponent;
    private boldToggle: ToggleComponent;
    private italicToggle: ToggleComponent;
    private opacitySlider: SliderComponent;
    private subfolderToggle: ToggleComponent;
    private filesToggle: ToggleComponent;
    private rainbowToggle: ToggleComponent;
    private fileTextColorPicker: ColorComponent;
    private fileBoldToggle: ToggleComponent;
    private fileItalicToggle: ToggleComponent;

    constructor(
        app: App,
        private plugin: ColorFolderPluginInterface,
        private filePath: string
    ) {
        super(app);
        this.previewPath = `color-folders-files-preview-${Date.now()}`;
        this.style = { ...(plugin.settings.styles[filePath] || {}) };
    }

    onOpen() {
        this.modalEl.addClass('color-folders-files-modal');
        
        const {contentEl} = this;
        contentEl.empty();

        // Preview section
        const previewSection = contentEl.createDiv('preview-section');
        this.previewEl = previewSection.createDiv('preview-item');
        this.previewEl.setAttribute('data-path', this.previewPath);
        const fileName = this.filePath.split('/').pop() || this.filePath;
        this.previewEl.createSpan().setText(fileName);
        if (this.isFolderTarget()) {
            this.filePreviewEl = previewSection.createDiv('preview-item child-file-preview');
            this.filePreviewEl.setAttribute('data-path', `${this.previewPath}-file`);
            this.filePreviewEl.createSpan().setText('File in this folder');
        }
        this.updatePreview();

        if (this.isFolderTarget()) {
            new Setting(contentEl).setHeading().setName('Folder appearance');
        }

        // Optional background color with hex input
        const bgColorSetting = new Setting(contentEl).setName('Background color');
        const bgColorContainer = bgColorSetting.controlEl.createDiv('color-container');

        bgColorSetting.addToggle(toggle => {
            this.bgToggle = toggle;
            toggle.setValue(isBackgroundEnabled(this.style))
                .onChange(value => {
                    this.style.backgroundColorEnabled = value;
                    if (value && !this.style.backgroundColor) {
                        this.style.backgroundColor = '#ffffff';
                    }
                    this.updatePreview();
                });
        });
        
        bgColorSetting.addColorPicker(color => {
            this.bgColorPicker = color;
            color.setValue(this.style.backgroundColor || '#ffffff')
                .onChange(value => {
                    this.style.backgroundColorEnabled = true;
                    this.style.backgroundColor = value;
                    bgHexInput.value = value;
                    if (this.bgToggle) this.bgToggle.setValue(true);
                    this.updatePreview();
                });
        });

        const bgHexInput = bgColorContainer.createEl('input', {
            type: 'text',
            cls: 'color-hex-input',
            value: this.style.backgroundColor || '#ffffff'
        });
        bgHexInput.addEventListener('change', () => {
            const value = bgHexInput.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this.style.backgroundColorEnabled = true;
                this.style.backgroundColor = value;
                this.bgColorPicker.setValue(value);
                if (this.bgToggle) this.bgToggle.setValue(true);
                this.updatePreview();
            }
        });

        // Optional border color with hex input
        const borderColorSetting = new Setting(contentEl).setName('Border color');
        const borderColorContainer = borderColorSetting.controlEl.createDiv('color-container');

        borderColorSetting.addToggle(toggle => {
            this.borderToggle = toggle;
            toggle.setValue(isBorderEnabled(this.style))
                .onChange(value => {
                    this.style.borderColorEnabled = value;
                    if (value && !this.style.borderColor) {
                        this.style.borderColor = '#000000';
                    }
                    this.updatePreview();
                });
        });

        borderColorSetting.addColorPicker(color => {
            this.borderColorPicker = color;
            color.setValue(this.style.borderColor || '#000000')
                .onChange(value => {
                    this.style.borderColorEnabled = true;
                    this.style.borderColor = value;
                    borderHexInput.value = value;
                    if (this.borderToggle) this.borderToggle.setValue(true);
                    this.updatePreview();
                });
        });

        const borderHexInput = borderColorContainer.createEl('input', {
            type: 'text',
            cls: 'color-hex-input',
            value: this.style.borderColor || '#000000'
        });
        borderHexInput.addEventListener('change', () => {
            const value = borderHexInput.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this.style.borderColorEnabled = true;
                this.style.borderColor = value;
                this.borderColorPicker.setValue(value);
                if (this.borderToggle) this.borderToggle.setValue(true);
                this.updatePreview();
            }
        });

        // Text color with hex input
        const textColorSetting = new Setting(contentEl)
            .setName(this.isFolderTarget() ? 'Folder text color' : 'File text color');
        const textColorContainer = textColorSetting.controlEl.createDiv('color-container');
        
        textColorSetting.addColorPicker(color => {
            this.textColorPicker = color;
            color.setValue(this.style.textColor || '#000000')
                .onChange(value => {
                    this.style.textColor = value;
                    textHexInput.value = value;
                    this.updatePreview();
                });
        });

        const textHexInput = textColorContainer.createEl('input', {
            type: 'text',
            cls: 'color-hex-input',
            value: this.style.textColor || '#000000'
        });
        textHexInput.addEventListener('change', () => {
            const value = textHexInput.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this.style.textColor = value;
                this.textColorPicker.setValue(value);
                this.updatePreview();
            }
        });

        // Bold toggle
        new Setting(contentEl)
            .setName(this.isFolderTarget() ? 'Folder bold' : 'File bold')
            .addToggle(toggle => {
                this.boldToggle = toggle;
                toggle.setValue(this.style.isBold || false)
                    .onChange(value => {
                        this.style.isBold = value;
                        this.updatePreview();
                    });
            });

        // Italic toggle
        new Setting(contentEl)
            .setName(this.isFolderTarget() ? 'Folder italic' : 'File italic')
            .addToggle(toggle => {
                this.italicToggle = toggle;
                toggle.setValue(this.style.isItalic || false)
                    .onChange(value => {
                        this.style.isItalic = value;
                        this.updatePreview();
                    });
            });

        // Opacity
        new Setting(contentEl)
            .setName('Opacity')
            .addSlider(slider => {
                this.opacitySlider = slider;
                slider.setLimits(0, 1, 0.1)
                    .setValue(this.style.opacity ?? 1)
                    .onChange(value => {
                        this.style.opacity = value;
                        this.updatePreview();
                    });
            });

        if (this.isFolderTarget()) {
            // Apply to subfolders
            new Setting(contentEl)
                .setName('Apply to subfolders')
                .addToggle(toggle => {
                    this.subfolderToggle = toggle;
                    toggle.setValue(this.style.applyToSubfolders || false)
                        .onChange(value => {
                            this.style.applyToSubfolders = value;
                        });
                });

            new Setting(contentEl).setHeading().setName('Files in this folder');

            // Apply a separate text style to files inside this folder
            new Setting(contentEl)
                .setName('Apply custom file text style')
                .setDesc('Uses the file text settings below instead of the folder text settings')
                .addToggle(toggle => {
                    this.filesToggle = toggle;
                    toggle.setValue(this.style.applyToFiles || false)
                        .onChange(value => {
                            this.style.applyToFiles = value;
                            if (value) {
                                this.ensureFileTextStyle();
                            }
                            this.updatePreview();
                        });
                });

            const fileTextColorSetting = new Setting(contentEl).setName('File text color');
            const fileTextColorContainer = fileTextColorSetting.controlEl.createDiv('color-container');
            fileTextColorSetting.addColorPicker(color => {
                this.fileTextColorPicker = color;
                color.setValue(this.style.fileTextColor || '#000000')
                    .onChange(value => {
                        this.style.fileTextColor = value;
                        this.style.applyToFiles = true;
                        fileTextHexInput.value = value;
                        if (this.filesToggle) this.filesToggle.setValue(true);
                        this.updatePreview();
                    });
            });

            const fileTextHexInput = fileTextColorContainer.createEl('input', {
                type: 'text',
                cls: 'color-hex-input',
                value: this.style.fileTextColor || '#000000'
            });
            fileTextHexInput.addEventListener('change', () => {
                const value = fileTextHexInput.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                    this.style.fileTextColor = value;
                    this.style.applyToFiles = true;
                    this.fileTextColorPicker.setValue(value);
                    if (this.filesToggle) this.filesToggle.setValue(true);
                    this.updatePreview();
                }
            });

            new Setting(contentEl)
                .setName('File bold')
                .addToggle(toggle => {
                    this.fileBoldToggle = toggle;
                    toggle.setValue(this.style.fileIsBold || false)
                        .onChange(value => {
                            this.style.fileIsBold = value;
                            this.style.applyToFiles = true;
                            if (this.filesToggle) this.filesToggle.setValue(true);
                            this.updatePreview();
                        });
                });

            new Setting(contentEl)
                .setName('File italic')
                .addToggle(toggle => {
                    this.fileItalicToggle = toggle;
                    toggle.setValue(this.style.fileIsItalic || false)
                        .onChange(value => {
                            this.style.fileIsItalic = value;
                            this.style.applyToFiles = true;
                            if (this.filesToggle) this.filesToggle.setValue(true);
                            this.updatePreview();
                        });
                });

            new Setting(contentEl)
                .setName('Rainbow file names')
                .setDesc('Give each file in this folder a stable random text color')
                .addToggle(toggle => {
                    this.rainbowToggle = toggle;
                    toggle.setValue(this.style.rainbowFileNames || false)
                        .onChange(value => {
                            this.style.rainbowFileNames = value;
                        });
                });
        }

        // Preset section
        if (Object.keys(this.plugin.settings.presets).length > 0) {
            new Setting(contentEl)
                .setName('Apply preset')
                .addDropdown(dropdown => {
                    Object.keys(this.plugin.settings.presets).forEach(preset => {
                        dropdown.addOption(preset, preset);
                    });
                    return dropdown.onChange(value => {
                        this.style = { ...this.plugin.settings.presets[value] };
                        this.updateControls();
                        this.updatePreview();
                    });
                });
        }

        // Save as preset section
        let presetNameInput: TextComponent;
        const presetSetting = new Setting(contentEl)
            .setClass('preset-save')
            .setName('Save as preset')
            .addText(text => {
                presetNameInput = text;
                text.setPlaceholder('Preset name');
            })
            .addButton(button => button
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    const presetName = presetNameInput.getValue();
                    if (presetName) {
                        if (this.plugin.settings.presets[presetName]) {
                            const shouldOverwrite = await this.plugin.confirmOverwritePreset(presetName);
                            if (!shouldOverwrite) return;
                        }
                        this.plugin.settings.presets[presetName] = { ...this.style };
                        await this.plugin.saveSettings();
                        presetNameInput.setValue('');
                        new Notice(`Preset "${presetName}" saved`);
                        // Refresh the modal to show the new preset
                        this.onOpen();
                    }
                }));

        // Buttons section
        const buttonSection = contentEl.createDiv('button-section');
        
        const removeButton = buttonSection.createEl('button', {
            text: 'Remove styling'
        });
        removeButton.addEventListener('click', async () => {
            delete this.plugin.settings.styles[this.filePath];
            await this.plugin.saveSettings();
            new Notice('Styling removed');
            this.close();
        });

        const resetButton = buttonSection.createEl('button', {
            text: 'Reset'
        });
        resetButton.addEventListener('click', () => {
            this.style = { ...DEFAULT_STYLE };
            this.updateControls();
            this.updatePreview();
        });

        const applyButton = buttonSection.createEl('button', {
            text: 'Apply',
            cls: 'mod-cta'
        });
        applyButton.addEventListener('click', async () => {
            await this.saveChanges();
            new Notice('Changes applied');
            this.close();
        });

        const closeButton = buttonSection.createEl('button', {
            text: 'Close'
        });
        closeButton.addEventListener('click', () => {
            this.close();
        });
    }

    updateControls() {
        if (this.bgToggle) this.bgToggle.setValue(isBackgroundEnabled(this.style));
        if (this.bgColorPicker) this.bgColorPicker.setValue(this.style.backgroundColor || '#ffffff');
        if (this.borderToggle) this.borderToggle.setValue(isBorderEnabled(this.style));
        if (this.borderColorPicker) this.borderColorPicker.setValue(this.style.borderColor || '#000000');
        if (this.textColorPicker) this.textColorPicker.setValue(this.style.textColor || '#000000');
        if (this.boldToggle) this.boldToggle.setValue(this.style.isBold || false);
        if (this.italicToggle) this.italicToggle.setValue(this.style.isItalic || false);
        if (this.opacitySlider) this.opacitySlider.setValue(this.style.opacity ?? 1);
        if (this.subfolderToggle) this.subfolderToggle.setValue(this.style.applyToSubfolders || false);
        if (this.filesToggle) this.filesToggle.setValue(this.style.applyToFiles || false);
        if (this.rainbowToggle) this.rainbowToggle.setValue(this.style.rainbowFileNames || false);
        if (this.fileTextColorPicker) this.fileTextColorPicker.setValue(this.style.fileTextColor || '#000000');
        if (this.fileBoldToggle) this.fileBoldToggle.setValue(this.style.fileIsBold || false);
        if (this.fileItalicToggle) this.fileItalicToggle.setValue(this.style.fileIsItalic || false);
    }

    updatePreview() {
        if (!this.previewEl) return;

        const backgroundColor = getStyleBackgroundColor(this.style);
        const borderColor = getStyleBorderColor(this.style);
        this.setPreviewProperty('background-color', backgroundColor);
        this.setPreviewProperty('transition', backgroundColor || borderColor ? 'background-color 0.1s ease, box-shadow 0.1s ease' : null);
        this.setPreviewProperty('box-shadow', borderColor ? `inset 0 0 0 1px ${borderColor}` : null);
        this.setPreviewProperty('color', this.style.textColor || null);
        this.setPreviewProperty('font-weight', this.style.isBold ? 'bold' : null);
        this.setPreviewProperty('font-style', this.style.isItalic ? 'italic' : null);
        this.previewEl.style.removeProperty('opacity');

        if (this.filePreviewEl) {
            this.updateFilePreview();
        }

        // Remove old hover styles
        if (this.styleEl) {
            this.styleEl.remove();
        }

        // Create new style element
        this.styleEl = document.createElement('style');
        const rules: string[] = [];

        if (this.style.textColor) {
            const escapedPath = CSS.escape(this.previewPath);
            rules.push(`
                .preview-item[data-path="${escapedPath}"]:hover {
                    color: ${this.style.textColor} !important;
                }
            `);
        }

        if (isBackgroundEnabled(this.style)) {
            const escapedPath = CSS.escape(this.previewPath);
            const hoverBackgroundColor = getStyleBackgroundColor(this.style, getStyleHoverOpacity(this.style)) || this.style.backgroundColor;

            rules.push(`
                /* Light mode: lighten on hover */
                body.theme-light .preview-item[data-path="${escapedPath}"]:hover {
                    background-color: color-mix(in srgb, white 20%, ${hoverBackgroundColor}) !important;
                    ${this.style.textColor ? `color: ${this.style.textColor} !important;` : ''}
                }

                /* Dark mode: darken on hover */
                body.theme-dark .preview-item[data-path="${escapedPath}"]:hover {
                    background-color: color-mix(in srgb, black 20%, ${hoverBackgroundColor}) !important;
                    ${this.style.textColor ? `color: ${this.style.textColor} !important;` : ''}
                }
            `);
        }

        this.styleEl.textContent = rules.join('\n');
        document.head.appendChild(this.styleEl);
    }

    private updateFilePreview() {
        const fileStyle = getChildFileTextStyle(this.style);
        this.filePreviewEl.style.setProperty('color', fileStyle.textColor || 'var(--text-normal)', 'important');
        this.filePreviewEl.style.setProperty('font-weight', fileStyle.isBold ? 'bold' : 'normal', 'important');
        this.filePreviewEl.style.setProperty('font-style', fileStyle.isItalic ? 'italic' : 'normal', 'important');
        this.filePreviewEl.style.setProperty('background-color', 'var(--background-primary)', 'important');
        this.filePreviewEl.style.removeProperty('box-shadow');
    }

    private ensureFileTextStyle() {
        if (!this.style.fileTextColor) {
            this.style.fileTextColor = '#000000';
        }
        if (typeof this.style.fileIsBold !== 'boolean') {
            this.style.fileIsBold = false;
        }
        if (typeof this.style.fileIsItalic !== 'boolean') {
            this.style.fileIsItalic = false;
        }
    }

    private setPreviewProperty(property: string, value: string | null) {
        if (value) {
            this.previewEl.style.setProperty(property, value, 'important');
        } else {
            this.previewEl.style.removeProperty(property);
        }
    }

    async saveChanges() {
        const previousStyle = this.plugin.settings.styles[this.filePath];

        if (previousStyle) {
            this.applyStyleToChildren(previousStyle, {
                subfolders: Boolean(previousStyle.applyToSubfolders && !this.style.applyToSubfolders),
                files: Boolean(previousStyle.applyToFiles && !this.style.applyToFiles)
            }, false);
        }

        this.plugin.settings.styles[this.filePath] = this.style;

        this.applyStyleToChildren(this.style, {
            subfolders: Boolean(this.style.applyToSubfolders),
            files: Boolean(this.style.applyToFiles)
        }, true);

        await this.plugin.saveSettings();
    }

    private applyStyleToChildren(
        style: StyleSettings,
        targets: { subfolders: boolean; files: boolean },
        overwriteExisting: boolean
    ) {
        if (!targets.subfolders && !targets.files) return;

        const targetFile = this.app.vault.getAbstractFileByPath(this.filePath);
        if (!(targetFile instanceof TFolder)) return;

        const childFolderStyle: StyleSettings = {
            ...style,
            applyToSubfolders: false,
            applyToFiles: false,
            rainbowFileNames: false
        };
        const childFileStyle: StyleSettings = {
            ...getChildFileTextStyle(style),
            applyToSubfolders: false,
            applyToFiles: false,
            rainbowFileNames: false
        };
        if (style.rainbowFileNames && targets.files) {
            delete childFileStyle.textColor;
        }
        const pathPrefix = `${this.filePath}/`;

        this.app.vault.getAllLoadedFiles().forEach(file => {
            if (!file.path.startsWith(pathPrefix)) return;
            if (!overwriteExisting && this.plugin.settings.styles[file.path]) return;

            if (targets.subfolders && file instanceof TFolder) {
                this.plugin.settings.styles[file.path] = { ...childFolderStyle };
            }

            if (targets.files && file instanceof TFile) {
                this.plugin.settings.styles[file.path] = { ...childFileStyle };
            }
        });
    }

    private isFolderTarget(): boolean {
        return this.app.vault.getAbstractFileByPath(this.filePath) instanceof TFolder;
    }

    onClose() {
        if (this.styleEl) {
            this.styleEl.remove();
        }
        this.modalEl.removeClass('color-folders-files-modal');
        const {contentEl} = this;
        contentEl.empty();
    }
}
