import * as react_jsx_runtime from 'react/jsx-runtime';
import * as React from 'react';
import { HTMLAttributes, ReactNode, AnchorHTMLAttributes, Ref } from 'react';
import { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';

/**
 * TypeScript types mirroring the `app.bsky.richtext.facet` lexicon.
 *
 * Reimplemented inside @gainforest/leaflet-react to avoid a separate package
 * dependency and to ensure TipTap version consistency (v2.27.2 throughout).
 */
/**
 * Byte range within UTF-8-encoded text.
 * byteStart is inclusive, byteEnd is exclusive.
 */
interface ByteSlice {
    byteStart: number;
    byteEnd: number;
}
interface MentionFeature {
    $type: 'app.bsky.richtext.facet#mention';
    did: string;
}
interface LinkFeature {
    $type: 'app.bsky.richtext.facet#link';
    uri: string;
}
interface TagFeature {
    $type: 'app.bsky.richtext.facet#tag';
    tag: string;
}
type FacetFeature = MentionFeature | LinkFeature | TagFeature;
interface Facet {
    index: ByteSlice;
    features: FacetFeature[];
}
interface RichTextRecord {
    text: string;
    facets?: Facet[];
}
interface RichTextSegment {
    text: string;
    feature?: FacetFeature;
}
declare function isMentionFeature(feature: FacetFeature): feature is MentionFeature;
declare function isLinkFeature(feature: FacetFeature): feature is LinkFeature;
declare function isTagFeature(feature: FacetFeature): feature is TagFeature;
interface RichTextDisplayClassNames {
    root?: string;
    mention?: string;
    link?: string;
    tag?: string;
}
interface RichTextSuggestionClassNames {
    root?: string;
    item?: string;
    itemSelected?: string;
    avatar?: string;
    avatarImg?: string;
    avatarPlaceholder?: string;
    text?: string;
    name?: string;
    handle?: string;
    empty?: string;
}
interface RichTextEditorClassNames {
    root?: string;
    content?: string;
    placeholder?: string;
    mention?: string;
    link?: string;
    /** CSS class applied to #hashtag decorations in the editor. */
    tag?: string;
    suggestion?: RichTextSuggestionClassNames;
}

interface MentionProps {
    text: string;
    did: string;
    feature: MentionFeature;
}
interface LinkProps {
    text: string;
    uri: string;
    feature: LinkFeature;
}
interface TagProps {
    text: string;
    tag: string;
    feature: TagFeature;
}
interface RichTextDisplayProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
    value: RichTextRecord | string;
    renderMention?: (props: MentionProps) => ReactNode;
    renderLink?: (props: LinkProps) => ReactNode;
    renderTag?: (props: TagProps) => ReactNode;
    disableLinks?: boolean;
    linkProps?: AnchorHTMLAttributes<HTMLAnchorElement>;
    classNames?: Partial<RichTextDisplayClassNames>;
    mentionUrl?: (did: string) => string;
    tagUrl?: (tag: string) => string;
    linkUrl?: (uri: string) => string;
}
declare function RichTextDisplay({ value, renderMention, renderLink, renderTag, disableLinks, linkProps, classNames, mentionUrl, tagUrl, linkUrl, ...spanProps }: RichTextDisplayProps): react_jsx_runtime.JSX.Element;

/**
 * Factory for the default TipTap suggestion renderer.
 * Uses @floating-ui/dom for positioning and ReactRenderer for the popup.
 */

interface DefaultSuggestionRendererOptions {
    showAvatars?: boolean;
    noResultsText?: string;
    classNames?: Partial<RichTextSuggestionClassNames>;
}
declare function createDefaultSuggestionRenderer(options?: DefaultSuggestionRendererOptions): SuggestionOptions<MentionSuggestion>['render'];

interface MentionSuggestion {
    did: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
}
interface RichTextEditorRef {
    focus: () => void;
    blur: () => void;
    clear: () => void;
    getText: () => string;
}
interface RichTextEditorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /**
     * Initial richtext value (uncontrolled — only read on mount).
     */
    initialValue?: RichTextRecord | string;
    onChange?: (record: RichTextRecord) => void;
    placeholder?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    /**
     * Custom mention query. When omitted, uses the Bluesky public API.
     */
    onMentionQuery?: (query: string) => Promise<MentionSuggestion[]>;
    mentionSearchDebounceMs?: number;
    disableDefaultMentionSearch?: boolean;
    renderMentionSuggestion?: SuggestionOptions['render'];
    mentionSuggestionOptions?: DefaultSuggestionRendererOptions;
    classNames?: Partial<RichTextEditorClassNames>;
    editorRef?: Ref<RichTextEditorRef>;
    editable?: boolean;
}
declare function RichTextEditor({ initialValue, onChange, placeholder, onFocus, onBlur, onMentionQuery, mentionSearchDebounceMs, disableDefaultMentionSearch, renderMentionSuggestion, mentionSuggestionOptions, classNames, editorRef, editable, ...divProps }: RichTextEditorProps): react_jsx_runtime.JSX.Element;

interface MentionSuggestionListRef {
    onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}
interface MentionSuggestionListProps extends SuggestionProps<MentionSuggestion> {
    showAvatars?: boolean;
    noResultsText?: string;
    classNames?: Partial<RichTextSuggestionClassNames>;
}
declare const MentionSuggestionList: React.ForwardRefExoticComponent<MentionSuggestionListProps & React.RefAttributes<MentionSuggestionListRef>>;

/**
 * Richtext parser — converts `{ text, facets }` into an ordered array of
 * `RichTextSegment` objects.
 */

declare function parseRichText(record: RichTextRecord): RichTextSegment[];

export { type ByteSlice, type DefaultSuggestionRendererOptions, type Facet, type FacetFeature, type LinkFeature, type LinkProps, type MentionFeature, type MentionProps, type MentionSuggestion, MentionSuggestionList, type MentionSuggestionListProps, type MentionSuggestionListRef, RichTextDisplay, type RichTextDisplayClassNames, type RichTextDisplayProps, RichTextEditor, type RichTextEditorClassNames, type RichTextEditorProps, type RichTextEditorRef, type RichTextRecord, type RichTextSegment, type RichTextSuggestionClassNames, type TagFeature, type TagProps, createDefaultSuggestionRenderer, isLinkFeature, isMentionFeature, isTagFeature, parseRichText };
