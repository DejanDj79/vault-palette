import { App, getAllTags, Plugin, PluginSettingTab, Setting, Notice, TextComponent, ColorComponent } from 'obsidian';
import { StyleSettings, ColorFolderPluginInterface } from '../types';
import { DEFAULT_STYLE } from '../constants';
import { getChildFileTextStyle, getStyleBackgroundColor, getStyleBorderColor, getStyleHoverOpacity, isBackgroundEnabled, isBorderEnabled } from '../utils/styleUtils';

export class ColorSettingsTab extends PluginSettingTab {
    private presetStyle: StyleSettings;
    private plugin: ColorFolderPluginInterface;
    private styleEl: HTMLStyleElement;
    private previewHoverRules: { [path: string]: string } = {};
    private activeTab: 'folders-files' | 'tags' = 'folders-files';

    constructor(app: App, plugin: Plugin & ColorFolderPluginInterface) {
        super(app, plugin);
        this.plugin = plugin;
        this.resetPresetStyle();
        this.syncPresetOrder();
    }

    private syncPresetOrder() {
        // Get all preset names
        const allPresets = Object.keys(this.plugin.settings.presets);

        // Initialize presetOrder if it doesn't exist
        if (!this.plugin.settings.presetOrder) {
            this.plugin.settings.presetOrder = [];
        }

        // Add any missing presets to the order
        allPresets.forEach(presetName => {
            if (!this.plugin.settings.presetOrder.includes(presetName)) {
                this.plugin.settings.presetOrder.push(presetName);
            }
        });

        // Remove any presets from the order that no longer exist
        this.plugin.settings.presetOrder = this.plugin.settings.presetOrder.filter(
            name => allPresets.includes(name)
        );

        this.plugin.saveSettings();
    }

    resetPresetStyle() {
        this.presetStyle = { ...DEFAULT_STYLE };
    }

    private syncTagSettings() {
        if (!this.plugin.settings.tagBackgroundColors) {
            this.plugin.settings.tagBackgroundColors = {};
        }
        if (typeof this.plugin.settings.tagTextColor !== 'string') {
            this.plugin.settings.tagTextColor = '';
        }
    }

    private createTabControls(containerEl: HTMLElement) {
        const tabContainer = containerEl.createDiv('cff-settings-tabs');
        this.createTabButton(tabContainer, 'folders-files', 'Folders & files');
        this.createTabButton(tabContainer, 'tags', 'Tags');
    }

    private createTabButton(
        tabContainer: HTMLElement,
        tab: 'folders-files' | 'tags',
        label: string
    ) {
        const button = tabContainer.createEl('button', {
            cls: this.activeTab === tab ? 'cff-settings-tab is-active' : 'cff-settings-tab',
            text: label
        });
        button.addEventListener('click', () => {
            this.activeTab = tab;
            this.display();
        });
    }

    hide() {
        // Clean up style element when tab is hidden
        if (this.styleEl) {
            this.styleEl.remove();
        }
        this.previewHoverRules = {};
        super.hide();
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        // Remove old style element if it exists
        if (this.styleEl) {
            this.styleEl.remove();
        }
        this.previewHoverRules = {};

        // Create new style element for hover states
        this.styleEl = document.createElement('style');
        document.head.appendChild(this.styleEl);

        // Ensure presetOrder is synced before displaying
        this.syncPresetOrder();

        this.syncTagSettings();
        this.createTabControls(containerEl);
        if (this.activeTab === 'tags') {
            this.displayTagsTab(containerEl);
            return;
        }

        // Create new preset section
        new Setting(containerEl).setHeading().setName('Create new preset');
        
        const previewEl = containerEl.createDiv('preview-item');
        previewEl.setAttribute('data-path', 'new-preset-preview');
        previewEl.createSpan().setText('Preview');
        this.updatePreview(previewEl);
        const filePreviewEl = containerEl.createDiv('preview-item child-file-preview');
        filePreviewEl.setAttribute('data-path', 'new-preset-file-preview');
        filePreviewEl.createSpan().setText('File preview');
        this.updatePreview(filePreviewEl, getChildFileTextStyle(this.presetStyle));
        const updatePreviews = () => {
            this.updatePreview(previewEl);
            this.updatePreview(filePreviewEl, getChildFileTextStyle(this.presetStyle));
        };

        let textComponent: TextComponent;
        let bgHexInput: HTMLInputElement;
        let bgColorPicker: ColorComponent;
        let borderHexInput: HTMLInputElement;
        let borderColorPicker: ColorComponent;
        let textHexInput: HTMLInputElement;
        let textColorPicker: ColorComponent;
        let boldToggle: any;
        let italicToggle: any;
        let opacitySlider: any;
        let filesToggle: any;
        let fileTextHexInput: HTMLInputElement;
        let fileTextColorPicker: ColorComponent;
        let fileBoldToggle: any;
        let fileItalicToggle: any;
        let rainbowToggle: any;

        const updatePresetControls = () => {
            if (this.bgToggle) this.bgToggle.setValue(isBackgroundEnabled(this.presetStyle));
            if (bgColorPicker) bgColorPicker.setValue(this.presetStyle.backgroundColor || '#ffffff');
            if (this.borderToggle) this.borderToggle.setValue(isBorderEnabled(this.presetStyle));
            if (borderColorPicker) borderColorPicker.setValue(this.presetStyle.borderColor || '#000000');
            if (textColorPicker) textColorPicker.setValue(this.presetStyle.textColor || '#000000');
            if (boldToggle) boldToggle.setValue(this.presetStyle.isBold || false);
            if (italicToggle) italicToggle.setValue(this.presetStyle.isItalic || false);
            if (opacitySlider) opacitySlider.setValue(this.presetStyle.opacity ?? 1);
            if (filesToggle) filesToggle.setValue(this.presetStyle.applyToFiles || false);
            if (fileTextColorPicker) fileTextColorPicker.setValue(this.presetStyle.fileTextColor || '#000000');
            if (fileBoldToggle) fileBoldToggle.setValue(this.presetStyle.fileIsBold || false);
            if (fileItalicToggle) fileItalicToggle.setValue(this.presetStyle.fileIsItalic || false);
            if (rainbowToggle) rainbowToggle.setValue(this.presetStyle.rainbowFileNames || false);
        };

        // Save preset section with name input and buttons
        new Setting(containerEl)
            .setClass('cff-preset-save')
            .setName('Save preset')
            .addText(text => {
                textComponent = text;
                text.setPlaceholder('Preset name')
                    .setValue('');
            })
            .addButton(button => button
                .setButtonText('Reset')
                .onClick(() => {
                    this.resetPresetStyle();
                    updatePreviews();
                    updatePresetControls();
                }))
            .addButton(button => button
                .setButtonText('Save')
                .setCta()
                .onClick(async () => {
                    const presetName = textComponent.getValue();
                    if (presetName) {
                        if (this.plugin.settings.presets[presetName]) {
                            const shouldOverwrite = await this.plugin.confirmOverwritePreset(presetName);
                            if (!shouldOverwrite) return;
                        }
                        this.plugin.settings.presets[presetName] = { ...this.presetStyle };
                        if (!this.plugin.settings.presetOrder.includes(presetName)) {
                            this.plugin.settings.presetOrder.push(presetName);
                        }
                        await this.plugin.saveSettings();
                        textComponent.setValue('');
                        this.display();
                        new Notice(`Preset "${presetName}" saved`);
                    }
                }));

        // Preset selector
        if (Object.keys(this.plugin.settings.presets).length > 0) {
            new Setting(containerEl)
                .setName('Start from preset')
                .setDesc('Select an existing preset as a starting point')
                .addDropdown(dropdown => {
                    dropdown.addOption('', 'Select a preset...');
                    Object.keys(this.plugin.settings.presets).forEach(preset => {
                        dropdown.addOption(preset, preset);
                    });
                    return dropdown.onChange(value => {
                        if (value) {
                            this.presetStyle = { ...this.plugin.settings.presets[value] };
                            updatePreviews();
                            updatePresetControls();
                            // Reset dropdown after selection
                            dropdown.setValue('');
                        }
                    });
                });
        }
        
        // Optional background color with hex input
        const bgColorSetting = new Setting(containerEl).setName('Background color');
        const bgColorContainer = bgColorSetting.controlEl.createDiv('color-container');

        bgColorSetting.addToggle(toggle => {
            this.bgToggle = toggle;
            toggle.setValue(isBackgroundEnabled(this.presetStyle))
                .onChange(value => {
                    this.presetStyle.backgroundColorEnabled = value;
                    if (value && !this.presetStyle.backgroundColor) {
                        this.presetStyle.backgroundColor = '#ffffff';
                    }
                    updatePreviews();
                });
        });

        bgColorSetting.addColorPicker(color => {
            bgColorPicker = color;
            this.bgColorPicker = color;
            color.setValue(this.presetStyle.backgroundColor || '#ffffff')
                .onChange(value => {
                    this.presetStyle.backgroundColorEnabled = true;
                    this.presetStyle.backgroundColor = value;
                    bgHexInput.value = value;
                    if (this.bgToggle) this.bgToggle.setValue(true);
                    updatePreviews();
                });
        });

        bgHexInput = bgColorContainer.createEl('input', {
            type: 'text',
            cls: 'color-hex-input',
            value: this.presetStyle.backgroundColor || '#ffffff'
        });
        bgHexInput.addEventListener('change', () => {
            const value = bgHexInput.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this.presetStyle.backgroundColorEnabled = true;
                this.presetStyle.backgroundColor = value;
                bgColorPicker.setValue(value);
                if (this.bgToggle) this.bgToggle.setValue(true);
                updatePreviews();
            }
        });

        // Optional border color with hex input
        const borderColorSetting = new Setting(containerEl).setName('Border color');
        const borderColorContainer = borderColorSetting.controlEl.createDiv('color-container');

        borderColorSetting.addToggle(toggle => {
            this.borderToggle = toggle;
            toggle.setValue(isBorderEnabled(this.presetStyle))
                .onChange(value => {
                    this.presetStyle.borderColorEnabled = value;
                    if (value && !this.presetStyle.borderColor) {
                        this.presetStyle.borderColor = '#000000';
                    }
                    updatePreviews();
                });
        });

        borderColorSetting.addColorPicker(color => {
            borderColorPicker = color;
            this.borderColorPicker = color;
            color.setValue(this.presetStyle.borderColor || '#000000')
                .onChange(value => {
                    this.presetStyle.borderColorEnabled = true;
                    this.presetStyle.borderColor = value;
                    borderHexInput.value = value;
                    if (this.borderToggle) this.borderToggle.setValue(true);
                    updatePreviews();
                });
        });

        borderHexInput = borderColorContainer.createEl('input', {
            type: 'text',
            cls: 'color-hex-input',
            value: this.presetStyle.borderColor || '#000000'
        });
        borderHexInput.addEventListener('change', () => {
            const value = borderHexInput.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this.presetStyle.borderColorEnabled = true;
                this.presetStyle.borderColor = value;
                borderColorPicker.setValue(value);
                if (this.borderToggle) this.borderToggle.setValue(true);
                updatePreviews();
            }
        });

        // Text color with hex input
        const textColorSetting = new Setting(containerEl).setName('Text color');
        const textColorContainer = textColorSetting.controlEl.createDiv('color-container');

        textColorSetting.addColorPicker(color => {
            textColorPicker = color;
            this.textColorPicker = color;
            color.setValue(this.presetStyle.textColor || '#000000')
                .onChange(value => {
                    this.presetStyle.textColor = value;
                    textHexInput.value = value;
                    updatePreviews();
                });
        });

        textHexInput = textColorContainer.createEl('input', {
            type: 'text',
            cls: 'color-hex-input',
            value: this.presetStyle.textColor || '#000000'
        });
        textHexInput.addEventListener('change', () => {
            const value = textHexInput.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this.presetStyle.textColor = value;
                textColorPicker.setValue(value);
                updatePreviews();
            }
        });

        // Bold toggle
        new Setting(containerEl)
            .setName('Bold')
            .addToggle(toggle => {
                boldToggle = toggle;
                this.boldToggle = toggle;
                toggle.setValue(this.presetStyle.isBold || false)
                    .onChange(value => {
                        this.presetStyle.isBold = value;
                        updatePreviews();
                    });
            });

        // Italic toggle
        new Setting(containerEl)
            .setName('Italic')
            .addToggle(toggle => {
                italicToggle = toggle;
                this.italicToggle = toggle;
                toggle.setValue(this.presetStyle.isItalic || false)
                    .onChange(value => {
                        this.presetStyle.isItalic = value;
                        updatePreviews();
                    });
            });

        // Opacity
        new Setting(containerEl)
            .setName('Opacity')
            .addSlider(slider => {
                opacitySlider = slider;
                this.opacitySlider = slider;
                slider.setLimits(0, 1, 0.1)
                    .setValue(this.presetStyle.opacity ?? 1)
                    .onChange(value => {
                        this.presetStyle.opacity = value;
                        updatePreviews();
                    });
            });

        new Setting(containerEl).setHeading().setName('Files in folder');

        new Setting(containerEl)
            .setName('Apply custom file text style')
            .setDesc('When this preset is applied to a folder, style files with the file settings below')
            .addToggle(toggle => {
                filesToggle = toggle;
                this.filesToggle = toggle;
                toggle.setValue(this.presetStyle.applyToFiles || false)
                    .onChange(value => {
                        this.presetStyle.applyToFiles = value;
                    });
            });

        const fileTextColorSetting = new Setting(containerEl)
            .setName('File text color')
            .setDesc('Used when this preset is applied to a folder with Apply custom file text style enabled');
        const fileTextColorContainer = fileTextColorSetting.controlEl.createDiv('color-container');

        fileTextColorSetting.addColorPicker(color => {
            fileTextColorPicker = color;
            this.fileTextColorPicker = color;
            color.setValue(this.presetStyle.fileTextColor || '#000000')
                .onChange(value => {
                    this.presetStyle.fileTextColor = value;
                    this.presetStyle.applyToFiles = true;
                    if (filesToggle) filesToggle.setValue(true);
                    fileTextHexInput.value = value;
                    updatePreviews();
                });
        });

        fileTextHexInput = fileTextColorContainer.createEl('input', {
            type: 'text',
            cls: 'color-hex-input',
            value: this.presetStyle.fileTextColor || '#000000'
        });
        fileTextHexInput.addEventListener('change', () => {
            const value = fileTextHexInput.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                this.presetStyle.fileTextColor = value;
                this.presetStyle.applyToFiles = true;
                if (filesToggle) filesToggle.setValue(true);
                fileTextColorPicker.setValue(value);
                updatePreviews();
            }
        });

        new Setting(containerEl)
            .setName('File bold')
            .addToggle(toggle => {
                fileBoldToggle = toggle;
                this.fileBoldToggle = toggle;
                toggle.setValue(this.presetStyle.fileIsBold || false)
                    .onChange(value => {
                        this.presetStyle.fileIsBold = value;
                        this.presetStyle.applyToFiles = true;
                        if (filesToggle) filesToggle.setValue(true);
                        updatePreviews();
                    });
        });

        new Setting(containerEl)
            .setName('File italic')
            .addToggle(toggle => {
                fileItalicToggle = toggle;
                this.fileItalicToggle = toggle;
                toggle.setValue(this.presetStyle.fileIsItalic || false)
                    .onChange(value => {
                        this.presetStyle.fileIsItalic = value;
                        this.presetStyle.applyToFiles = true;
                        if (filesToggle) filesToggle.setValue(true);
                        updatePreviews();
                    });
        });

        new Setting(containerEl)
            .setName('Rainbow file names')
            .setDesc('When applied to a folder, each file gets a stable random text color')
            .addToggle(toggle => {
                rainbowToggle = toggle;
                this.rainbowToggle = toggle;
                toggle.setValue(this.presetStyle.rainbowFileNames || false)
                    .onChange(value => {
                        this.presetStyle.rainbowFileNames = value;
                    });
            });

        // Existing presets section
        new Setting(containerEl).setHeading().setName('Existing presets');
        
        const presetsContainer = containerEl.createDiv('presets-container');

        // Create preset elements in order
        this.plugin.settings.presetOrder.forEach((name) => {
            const preset = this.plugin.settings.presets[name];
            if (!preset) return; // Skip if preset was deleted

            const presetContainer = presetsContainer.createDiv('preset-container');
            presetContainer.setAttribute('draggable', 'true');
            presetContainer.dataset.presetName = name;
            
            // Handle drag events
            presetContainer.addEventListener('dragstart', (e: DragEvent) => {
                if (e.dataTransfer) {
                    e.dataTransfer.setData('text/plain', name);
                    presetContainer.addClass('dragging');
                }
            });

            presetContainer.addEventListener('dragend', () => {
                presetContainer.removeClass('dragging');
            });

            presetContainer.addEventListener('dragover', (e: DragEvent) => {
                e.preventDefault();
                const dragging = presetsContainer.querySelector('.dragging');
                if (!dragging) return;
                
                const siblings = Array.from(presetsContainer.querySelectorAll('.preset-container:not(.dragging)'));
                const nextSibling = siblings.find(sibling => {
                    const rect = sibling.getBoundingClientRect();
                    const offset = e.clientY - rect.top - rect.height / 2;
                    return offset < 0;
                });

                if (nextSibling) {
                    presetsContainer.insertBefore(dragging, nextSibling);
                } else {
                    presetsContainer.appendChild(dragging);
                }
            });

            presetContainer.addEventListener('drop', async (e: DragEvent) => {
                e.preventDefault();
                if (e.dataTransfer) {
                    const containers = Array.from(presetsContainer.querySelectorAll('.preset-container')) as HTMLElement[];
                    const newOrder = containers.map(container => container.dataset.presetName).filter((name): name is string => name !== undefined);
                    
                    this.plugin.settings.presetOrder = newOrder;
                    await this.plugin.saveSettings();
                }
            });
            
            const previewEl = presetContainer.createDiv('preview-item');
            previewEl.setAttribute('data-path', `preset-${name}`);
            previewEl.createSpan().setText(name);
            this.updatePreview(previewEl, preset);

            const dragHandle = presetContainer.createDiv('drag-handle');
            const handleIcon = dragHandle.createSpan();
            handleIcon.setText('⋮⋮');

            new Setting(presetContainer)
                .addButton(btn => btn
                    .setIcon('trash')
                    .setTooltip('Delete preset')
                    .onClick(async () => {
                        delete this.plugin.settings.presets[name];
                        this.plugin.settings.presetOrder = this.plugin.settings.presetOrder.filter(n => n !== name);
                        await this.plugin.saveSettings();
                        this.display();
                        new Notice(`Preset "${name}" deleted`);
                    }));
        });

        // Import/Export section
        new Setting(containerEl).setHeading().setName('Import/export');
        
        const importExportContainer = containerEl.createDiv('settings-import-export');
        
        // Import button
        const importButton = importExportContainer.createEl('button', {
            text: 'Import'
        });
        importButton.addEventListener('click', async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async () => {
                const file = input.files?.[0];
                if (file) {
                    try {
                        const text = await file.text();
                        const settings = JSON.parse(text);
                        
                        // Validate settings structure
                        if (settings && 
                            typeof settings === 'object' && 
                            'styles' in settings && 
                            'presets' in settings) {
                            this.plugin.settings = settings;
                            // Sync presetOrder with imported settings
                            this.syncPresetOrder();
                            await this.plugin.saveSettings();
                            this.display();
                            new Notice('Settings imported successfully');
                        } else {
                            new Notice('Invalid settings file format');
                        }
                    } catch (e) {
                        console.error('Error importing settings:', e);
                        new Notice('Error importing settings');
                    }
                }
            };
            
            input.click();
        });

        // Export button
        const exportButton = importExportContainer.createEl('button', {
            text: 'Export'
        });
        exportButton.addEventListener('click', () => {
            const settingsJson = JSON.stringify(this.plugin.settings, null, 2);
            const blob = new Blob([settingsJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `vault-palette-settings-v${this.plugin.manifest.version}.json`;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
        });
    }

    private updatePreview(previewEl: HTMLElement, style: StyleSettings = this.presetStyle) {
        const path = previewEl.getAttribute('data-path');
        if (!path || !style) return;

        // Update base styles
        const backgroundColor = getStyleBackgroundColor(style);
        const borderColor = getStyleBorderColor(style);
        previewEl.style.backgroundColor = backgroundColor || '';
        previewEl.style.transition = backgroundColor || borderColor ? 'background-color 0.1s ease, box-shadow 0.1s ease' : '';
        previewEl.style.boxShadow = borderColor ? `inset 0 0 0 1px ${borderColor}` : '';
        previewEl.style.color = style.textColor || '';
        previewEl.style.fontWeight = style.isBold ? 'bold' : '';
        previewEl.style.fontStyle = style.isItalic ? 'italic' : '';
        previewEl.style.opacity = '';

        const hoverRules = this.buildPreviewHoverRules(path, style);
        if (hoverRules) {
            this.previewHoverRules[path] = hoverRules;
        } else {
            delete this.previewHoverRules[path];
        }
        this.styleEl.textContent = Object.keys(this.previewHoverRules)
            .map(key => this.previewHoverRules[key])
            .join('\n');
    }

    private buildPreviewHoverRules(path: string, style: StyleSettings): string {
        const escapedPath = CSS.escape(path);
        const rules: string[] = [];

        if (style.textColor) {
            rules.push(`
                .preview-item[data-path="${escapedPath}"]:hover {
                    color: ${style.textColor} !important;
                }
            `);
        }

        if (isBackgroundEnabled(style)) {
            const hoverBackgroundColor = getStyleBackgroundColor(style, getStyleHoverOpacity(style)) || style.backgroundColor;

            rules.push(`
                /* Light mode: lighten on hover */
                body.theme-light .preview-item[data-path="${escapedPath}"]:hover {
                    background-color: color-mix(in srgb, white 20%, ${hoverBackgroundColor}) !important;
                    ${style.textColor ? `color: ${style.textColor} !important;` : ''}
                }

                /* Dark mode: darken on hover */
                body.theme-dark .preview-item[data-path="${escapedPath}"]:hover {
                    background-color: color-mix(in srgb, black 20%, ${hoverBackgroundColor}) !important;
                    ${style.textColor ? `color: ${style.textColor} !important;` : ''}
                }
            `);
        }

        return rules.join('\n');
    }

    private displayTagsTab(containerEl: HTMLElement) {
        this.syncTagSettings();

        new Setting(containerEl).setHeading().setName('Tags');

        const previewTag = containerEl.createEl('a', {
            cls: 'tag cff-tag-preview',
            text: '#tag-preview'
        });
        previewTag.setAttribute('href', '#tag-preview');
        this.updateTagPreview(previewTag);

        new Setting(containerEl)
            .setName('Tag text color')
            .addColorPicker(color => {
                color.setValue(this.plugin.settings.tagTextColor || '#ffffff')
                    .onChange(async value => {
                        this.plugin.settings.tagTextColor = value;
                        this.updateTagPreview(previewTag);
                        await this.plugin.saveSettings();
                    });
            })
            .addButton(button => button
                .setButtonText('Clear')
                .onClick(async () => {
                    this.plugin.settings.tagTextColor = '';
                    this.updateTagPreview(previewTag);
                    await this.plugin.saveSettings();
                    this.display();
                }));

        const detectedTags = this.getDetectedTags();
        new Setting(containerEl)
            .setHeading()
            .setName(`Detected tags (${detectedTags.length})`);

        if (detectedTags.length === 0) {
            containerEl.createEl('p', {
                cls: 'setting-item-description',
                text: 'No tags detected in the vault metadata cache yet.'
            });
            return;
        }

        detectedTags.forEach(tag => {
            const tagKey = this.normalizeTag(tag);
            const tagName = `#${tagKey}`;
            const tagColor = this.plugin.settings.tagBackgroundColors?.[tagKey] || '#4a90e2';

            const setting = new Setting(containerEl)
                .setName(tagName)
                .addColorPicker(color => {
                    color.setValue(tagColor)
                        .onChange(async value => {
                            this.syncTagSettings();
                            this.plugin.settings.tagBackgroundColors![tagKey] = value;
                            await this.plugin.saveSettings();
                        });
                });

            if (this.plugin.settings.tagBackgroundColors?.[tagKey]) {
                setting.addButton(button => button
                    .setIcon('trash')
                    .setTooltip('Clear tag background')
                    .onClick(async () => {
                        delete this.plugin.settings.tagBackgroundColors![tagKey];
                        await this.plugin.saveSettings();
                        this.display();
                    }));
            }
        });
    }

    private updateTagPreview(previewTag: HTMLElement) {
        previewTag.style.setProperty('color', this.plugin.settings.tagTextColor || 'var(--text-normal)', 'important');
        previewTag.style.setProperty('background-color', 'var(--background-modifier-hover)', 'important');
    }

    private getDetectedTags(): string[] {
        const tags = new Set<string>();

        this.app.vault.getMarkdownFiles().forEach(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return;

            getAllTags(cache)?.forEach(tag => tags.add(this.normalizeTag(tag)));
        });

        Object.keys(this.plugin.settings.tagBackgroundColors || {})
            .forEach(tag => tags.add(this.normalizeTag(tag)));

        return Array.from(tags)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
    }

    private normalizeTag(tag: string): string {
        return tag.replace(/^#/, '');
    }

    // Properties for control references
    private bgToggle: any;
    private bgColorPicker: ColorComponent;
    private borderToggle: any;
    private borderColorPicker: ColorComponent;
    private textColorPicker: ColorComponent;
    private boldToggle: any;
    private italicToggle: any;
    private opacitySlider: any;
    private filesToggle: any;
    private fileTextColorPicker: ColorComponent;
    private fileBoldToggle: any;
    private fileItalicToggle: any;
    private rainbowToggle: any;
}
