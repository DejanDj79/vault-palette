import { App, TFile, TFolder } from 'obsidian';
import { ColorFolderSettings, StyleSettings } from '../types';
import { getChildFileTextStyle, getStyleBackgroundColor, getStyleBorderColor, getStyleHoverOpacity, isBackgroundEnabled } from '../utils/styleUtils';

export class StyleManager {
    private styleEl: HTMLStyleElement;
    private observer: MutationObserver;
    private refreshTagAttributesFrame: number | null = null;

    constructor(private app: App) {
        this.styleEl = document.createElement('style');
        document.head.appendChild(this.styleEl);
        this.observer = new MutationObserver(() => this.scheduleRefreshTagAttributes());
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class', 'href', 'data-tag-name', 'aria-label', 'title']
        });
    }

    updateStyles(settings: ColorFolderSettings) {
        const styles = settings.styles || {};
        const baseRules: string[] = [];
        const inheritedRules: (string | null)[] = [];
        const rainbowRules: string[] = [];
        const tagRules = this.buildTagRules(settings);
        const exactRules: (string | null)[] = [];

        // Add base transitions
        baseRules.push(`
            .nav-folder-title,
            .nav-file-title,
            .preview-item {
                transition: background-color 0.1s ease, box-shadow 0.1s ease !important;
            }
        `);

        for (const [path, style] of Object.entries(styles)) {
            const escapedPath = CSS.escape(path);

            exactRules.push(
                this.buildStyleRule(`.nav-folder-title[data-path="${escapedPath}"]`, style),
                this.buildStyleRule(`.nav-file-title[data-path="${escapedPath}"]`, style),
                this.buildStyleRule(`.preview-item[data-path="${escapedPath}"]`, style)
            );

            // Subfolders
            if (style.applyToSubfolders) {
                inheritedRules.push(
                    this.buildStyleRule(`.nav-folder-title[data-path^="${escapedPath}/"]`, style)
                );
            }

            // Files
            if (style.applyToFiles) {
                inheritedRules.push(
                    this.buildStyleRule(`.nav-file-title[data-path^="${escapedPath}/"]`, getChildFileTextStyle(style))
                );
            }

            if (style.rainbowFileNames) {
                rainbowRules.push(...this.buildRainbowFileRules(path, style));
            }
        }

        this.styleEl.textContent = [...baseRules, ...inheritedRules, ...rainbowRules, ...tagRules, ...exactRules]
            .filter((rule): rule is string => Boolean(rule))
            .join('\n');
        this.scheduleRefreshTagAttributes();
    }

    cleanup() {
        this.observer.disconnect();
        if (this.refreshTagAttributesFrame !== null) {
            cancelAnimationFrame(this.refreshTagAttributesFrame);
            this.refreshTagAttributesFrame = null;
        }
        if (this.styleEl && this.styleEl.parentNode) {
            this.styleEl.parentNode.removeChild(this.styleEl);
        }
    }

    private buildStyleRule(selector: string, style: StyleSettings): string | null {
        const declarations = this.buildDeclarations(style);
        if (declarations.length === 0) {
            return null;
        }

        const rules = [`
            ${selector} {
                ${declarations.join('\n                ')}
            }
        `];

        if (style.textColor) {
            rules.push(`
                ${selector}:hover {
                    color: ${style.textColor} !important;
                }
            `);
        }

        if (isBackgroundEnabled(style)) {
            const hoverColor = getStyleBackgroundColor(style, getStyleHoverOpacity(style)) || style.backgroundColor;

            rules.push(`
                /* Light mode: lighten on hover */
                body.theme-light ${selector}:hover {
                    background-color: color-mix(in srgb, white 20%, ${hoverColor}) !important;
                    ${style.textColor ? `color: ${style.textColor} !important;` : ''}
                }

                /* Dark mode: darken on hover */
                body.theme-dark ${selector}:hover {
                    background-color: color-mix(in srgb, black 20%, ${hoverColor}) !important;
                    ${style.textColor ? `color: ${style.textColor} !important;` : ''}
                }
            `);
        }

        return rules.join('\n');
    }

    private buildDeclarations(style: StyleSettings): string[] {
        const declarations: string[] = [];
        const backgroundColor = getStyleBackgroundColor(style);
        const borderColor = getStyleBorderColor(style);

        if (backgroundColor) {
            declarations.push(`background-color: ${backgroundColor} !important;`);
        }
        if (borderColor) {
            declarations.push(`box-shadow: inset 0 0 0 1px ${borderColor} !important;`);
        }
        if (style.textColor) {
            declarations.push(`color: ${style.textColor} !important;`);
        }
        if (style.isBold) {
            declarations.push('font-weight: bold !important;');
        }
        if (style.isItalic) {
            declarations.push('font-style: italic !important;');
        }

        return declarations;
    }

    private buildRainbowFileRules(folderPath: string, style: StyleSettings): string[] {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!(folder instanceof TFolder)) {
            return [];
        }

        return this.app.vault.getFiles()
            .filter(file => this.isRainbowTarget(folderPath, file, Boolean(style.applyToFiles)))
            .sort((a, b) => a.path.localeCompare(b.path))
            .map(file => {
                const escapedPath = CSS.escape(file.path);
                const color = this.getRainbowColor(`${folderPath}/${file.path}`);

                return `
                    .nav-file-title[data-path="${escapedPath}"],
                    .nav-file-title[data-path="${escapedPath}"]:hover {
                        color: ${color} !important;
                    }
                `;
            });
    }

    private isRainbowTarget(folderPath: string, file: TFile, includeNestedFiles: boolean): boolean {
        const pathPrefix = `${folderPath}/`;
        if (!file.path.startsWith(pathPrefix)) {
            return false;
        }

        if (includeNestedFiles) {
            return true;
        }

        return !file.path.slice(pathPrefix.length).includes('/');
    }

    private getRainbowColor(seed: string): string {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash + seed.charCodeAt(i)) >>> 0;
        }

        const hue = hash % 360;
        const saturation = 70 + (hash % 16);
        const lightness = 48 + (hash % 10);
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    private buildTagRules(settings: ColorFolderSettings): string[] {
        const rules: string[] = [];
        const tagTextColor = settings.tagTextColor;

        if (tagTextColor) {
            rules.push(`
                a.tag,
                a.tag:hover,
                .cm-hashtag,
                .cm-hashtag:hover,
                .metadata-property-value[data-property-type="tags"] .multi-select-pill,
                .metadata-property-value[data-property-type="tags"] .multi-select-pill:hover,
                .metadata-property[data-property-key="tags"] .multi-select-pill,
                .metadata-property[data-property-key="tags"] .multi-select-pill:hover,
                .multi-select-pill[data-cff-tag],
                .multi-select-pill[data-cff-tag]:hover,
                .multi-select-pill-content[data-cff-tag],
                .tag-pane-tag .tree-item-inner,
                .tag-pane-tag:hover .tree-item-inner,
                [data-cff-tag]:not(.tag-pane-tag),
                [data-cff-tag]:not(.tag-pane-tag):hover,
                [data-cff-tag] .tree-item-inner,
                [data-cff-tag]:hover .tree-item-inner {
                    color: ${tagTextColor} !important;
                    --tag-color: ${tagTextColor} !important;
                    --tag-color-hover: ${tagTextColor} !important;
                    --pill-color: ${tagTextColor} !important;
                }
            `);
        }

        Object.entries(settings.tagBackgroundColors || {}).forEach(([tag, backgroundColor]) => {
            if (!backgroundColor) return;

            const selector = this.buildTagSelector(tag);
            const hoverSelector = this.buildHoverSelector(selector);
            rules.push(`
                ${selector},
                ${hoverSelector} {
                    background-color: ${backgroundColor} !important;
                    --tag-background: ${backgroundColor} !important;
                    --tag-background-hover: ${backgroundColor} !important;
                    --pill-background: ${backgroundColor} !important;
                    --pill-background-hover: ${backgroundColor} !important;
                    border-radius: var(--tag-radius, var(--pill-radius, var(--radius-s))) !important;
                    ${tagTextColor ? `color: ${tagTextColor} !important; --tag-color: ${tagTextColor} !important; --pill-color: ${tagTextColor} !important;` : ''}
                }
            `);
        });

        return rules;
    }

    private buildTagSelector(tag: string): string {
        const normalizedTag = this.normalizeTag(tag);
        const href = this.escapeCssAttributeValue(`#${normalizedTag}`);
        const encodedHref = this.escapeCssAttributeValue(`#${encodeURIComponent(normalizedTag)}`);
        const dataTag = this.escapeCssAttributeValue(normalizedTag);

        return [
            `a.tag[href="${href}"]`,
            `a.tag[href="${encodedHref}"]`,
            `a.tag[href$="${href}"]`,
            `a.tag[href$="${encodedHref}"]`,
            `a.tag[data-cff-tag="${dataTag}"]`,
            `.tag[href="${href}"]`,
            `.tag[href="${encodedHref}"]`,
            `.tag[href$="${href}"]`,
            `.tag[href$="${encodedHref}"]`,
            `.tag[data-tag-name="${dataTag}"]`,
            `.cm-hashtag[data-cff-tag="${dataTag}"]`,
            `.multi-select-pill[data-cff-tag="${dataTag}"]`,
            `.multi-select-pill-content[data-cff-tag="${dataTag}"]`,
            `.metadata-property-value[data-property-type="tags"] .multi-select-pill[data-cff-tag="${dataTag}"]`,
            `.metadata-property-value[data-property-type="tags"] .multi-select-pill-content[data-cff-tag="${dataTag}"]`,
            `.metadata-property[data-property-key="tags"] .multi-select-pill[data-cff-tag="${dataTag}"]`,
            `.metadata-property[data-property-key="tags"] .multi-select-pill-content[data-cff-tag="${dataTag}"]`,
            `.tag-pane-tag[data-cff-tag="${dataTag}"] .tree-item-inner`,
            `.tag-pane-tag .tree-item-inner[data-cff-tag="${dataTag}"]`,
            `.tree-item-self[data-tag="${dataTag}"] .tree-item-inner`
        ].join(',\n                ');
    }

    private buildHoverSelector(selector: string): string {
        return selector
            .split(',')
            .map(part => `${part.trim()}:hover`)
            .join(',\n                ');
    }

    private normalizeTag(tag: string): string {
        return tag.trim().replace(/^#+/, '').trim();
    }

    private escapeCssAttributeValue(value: string): string {
        return value
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"');
    }

    private scheduleRefreshTagAttributes() {
        if (this.refreshTagAttributesFrame !== null) {
            return;
        }

        this.refreshTagAttributesFrame = requestAnimationFrame(() => {
            this.refreshTagAttributesFrame = null;
            this.refreshTagAttributes();
        });
    }

    private refreshTagAttributes() {
        document.querySelectorAll<HTMLElement>('a.tag, .tag[href]').forEach(el => {
            const tag = this.getTagFromElement(el);
            this.setTagAttribute(el, tag);
        });

        document.querySelectorAll<HTMLElement>('.tag-pane-tag').forEach(el => {
            const tag = this.getTagPaneTag(el);
            this.setTagAttribute(el, tag);
            this.setTagAttribute(el.querySelector<HTMLElement>('.tree-item-inner'), tag);
        });

        document.querySelectorAll<HTMLElement>(this.getPropertyTagSelector()).forEach(el => {
            const tag = this.getPropertyTag(el);
            this.setTagAttribute(el, tag);
            this.setTagAttribute(el.querySelector<HTMLElement>('.multi-select-pill-content'), tag);
        });

        this.refreshCodeMirrorTagAttributes();
    }

    private getTagFromElement(el: HTMLElement): string | null {
        const href = el.getAttribute('href');
        if (href) {
            const hashIndex = href.lastIndexOf('#');
            if (hashIndex >= 0) {
                return this.normalizeTag(this.decodeTag(href.slice(hashIndex + 1)));
            }
        }

        const text = el.textContent?.trim();
        if (text?.startsWith('#')) {
            return this.normalizeTag(text);
        }

        return null;
    }

    private getTagPaneTag(el: HTMLElement): string | null {
        const innerText = el.querySelector<HTMLElement>('.tree-item-inner')?.textContent?.trim()
            || el.getAttribute('aria-label')
            || el.getAttribute('title')
            || '';

        const countText = el.querySelector<HTMLElement>('.tag-pane-tag-count')?.textContent?.trim();
        const tag = countText && innerText.endsWith(countText)
            ? innerText.slice(0, -countText.length).trim()
            : innerText;

        return tag ? this.normalizeTag(tag) : null;
    }

    private getPropertyTag(el: HTMLElement): string | null {
        const contentText = el.querySelector<HTMLElement>('.multi-select-pill-content')?.textContent?.trim()
            || el.textContent?.trim()
            || '';

        const removeButtonText = el.querySelector<HTMLElement>('.multi-select-pill-remove-button')?.textContent?.trim();
        const tag = removeButtonText && contentText.endsWith(removeButtonText)
            ? contentText.slice(0, -removeButtonText.length).trim()
            : contentText;

        return tag ? this.normalizeTag(tag) : null;
    }

    private getPropertyTagSelector(): string {
        return [
            '.metadata-property[data-property-key="tags"] .multi-select-pill',
            '.metadata-property-value[data-property-type="tags"] .multi-select-pill',
            '.metadata-property-value[data-property-key="tags"] .multi-select-pill'
        ].join(', ');
    }

    private refreshCodeMirrorTagAttributes() {
        document.querySelectorAll<HTMLElement>('.cm-line').forEach(line => {
            this.refreshCodeMirrorTagsInLine(line);
        });

        document.querySelectorAll<HTMLElement>('.cm-hashtag:not([data-cff-tag])').forEach(el => {
            const tag = this.getCodeMirrorSingleTag(el);
            this.setTagAttribute(el, tag);
        });
    }

    private refreshCodeMirrorTagsInLine(line: HTMLElement) {
        const tagParts: HTMLElement[] = [];
        let tagText = '';

        const flushTagParts = () => {
            if (tagParts.length === 0) return;

            this.setTagAttributesForParts(tagParts, tagText);
            tagParts.length = 0;
            tagText = '';
        };

        line.querySelectorAll<HTMLElement>('.cm-hashtag').forEach(el => {
            const text = el.textContent || '';
            const beginsNewTag = text.startsWith('#') || el.hasClass('cm-hashtag-begin');
            if (beginsNewTag && tagParts.length > 0) {
                flushTagParts();
            }

            tagParts.push(el);
            tagText += text;

            const isSinglePartTag = text.startsWith('#')
                && !el.hasClass('cm-hashtag-begin')
                && !el.hasClass('cm-hashtag-end');

            if (el.hasClass('cm-hashtag-end') || isSinglePartTag) {
                flushTagParts();
            }
        });

        flushTagParts();
    }

    private getCodeMirrorSingleTag(el: HTMLElement): string | null {
        const text = el.textContent?.trim();
        return text?.startsWith('#') ? this.normalizeTag(text) : null;
    }

    private setTagAttributesForParts(parts: HTMLElement[], tagText: string) {
        const tag = tagText ? this.normalizeTag(tagText) : null;
        parts.forEach(part => this.setTagAttribute(part, tag));
    }

    private setTagAttribute(el: HTMLElement | null, tag: string | null) {
        if (!el) return;

        if (tag) {
            el.setAttribute('data-cff-tag', tag);
        } else {
            el.removeAttribute('data-cff-tag');
        }
    }

    private decodeTag(tag: string): string {
        try {
            return decodeURIComponent(tag);
        } catch (e) {
            return tag;
        }
    }
}
