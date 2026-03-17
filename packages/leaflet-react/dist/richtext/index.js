// src/richtext/RichTextDisplay.tsx
import { useMemo } from "react";

// src/richtext/types.ts
function isMentionFeature(feature) {
  return feature.$type === "app.bsky.richtext.facet#mention";
}
function isLinkFeature(feature) {
  return feature.$type === "app.bsky.richtext.facet#link";
}
function isTagFeature(feature) {
  return feature.$type === "app.bsky.richtext.facet#tag";
}

// src/richtext/utf8.ts
var encoder = new TextEncoder();
function utf8ByteOffsetToCharIndex(text, byteOffset) {
  const bytes = encoder.encode(text);
  const decoder = new TextDecoder();
  const slice = bytes.slice(0, byteOffset);
  return decoder.decode(slice).length;
}
function sliceByByteOffset(text, byteStart, byteEnd) {
  const startChar = utf8ByteOffsetToCharIndex(text, byteStart);
  const endChar = utf8ByteOffsetToCharIndex(text, byteEnd);
  return text.slice(startChar, endChar);
}
function utf8ByteLength(text) {
  return encoder.encode(text).length;
}

// src/richtext/parser.ts
function sortFacets(facets) {
  return [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
}
function pickFeature(features) {
  return features[0];
}
function parseRichText(record) {
  const { text, facets } = record;
  if (!facets || facets.length === 0) {
    return [{ text }];
  }
  const textByteLength = utf8ByteLength(text);
  const sorted = sortFacets(facets);
  const segments = [];
  let cursor = 0;
  for (const facet of sorted) {
    const { byteStart, byteEnd } = facet.index;
    if (byteStart < cursor || byteEnd > textByteLength || byteStart >= byteEnd) {
      continue;
    }
    if (byteStart > cursor) {
      segments.push({ text: sliceByByteOffset(text, cursor, byteStart) });
    }
    const feature = pickFeature(facet.features);
    const segment = { text: sliceByByteOffset(text, byteStart, byteEnd) };
    if (feature !== void 0) segment.feature = feature;
    segments.push(segment);
    cursor = byteEnd;
  }
  if (cursor < textByteLength) {
    segments.push({ text: sliceByByteOffset(text, cursor, textByteLength) });
  }
  return segments;
}

// src/richtext/RichTextDisplay.tsx
import { jsx } from "react/jsx-runtime";
function toShortUrl(url, maxLength = 30) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const rest = parsed.pathname + parsed.search + parsed.hash;
    const full = host + (rest === "/" ? "" : rest);
    if (full.length <= maxLength) return full;
    return full.slice(0, maxLength) + "\u2026";
  } catch {
    return url;
  }
}
function DefaultMention({
  text,
  did,
  mentionUrl: buildUrl,
  className,
  linkProps
}) {
  const href = buildUrl ? buildUrl(did) : `https://bsky.app/profile/${did}`;
  return /* @__PURE__ */ jsx("a", { href, className, target: "_blank", rel: "noopener noreferrer", "data-did": did, ...linkProps, children: text });
}
function DefaultLink({
  text,
  uri,
  linkUrl: buildUrl,
  className,
  linkProps
}) {
  const href = buildUrl ? buildUrl(uri) : uri;
  return /* @__PURE__ */ jsx("a", { href, className, target: "_blank", rel: "noopener noreferrer", ...linkProps, children: toShortUrl(text) });
}
function DefaultTag({
  text,
  tag,
  tagUrl: buildUrl,
  className,
  linkProps
}) {
  const href = buildUrl ? buildUrl(tag) : `https://bsky.app/hashtag/${encodeURIComponent(tag)}`;
  return /* @__PURE__ */ jsx("a", { href, className, target: "_blank", rel: "noopener noreferrer", "data-tag": tag, ...linkProps, children: text });
}
function RichTextDisplay({
  value,
  renderMention,
  renderLink,
  renderTag,
  disableLinks = false,
  linkProps,
  classNames,
  mentionUrl,
  tagUrl,
  linkUrl,
  ...spanProps
}) {
  const record = typeof value === "string" ? { text: value } : value;
  const segments = useMemo(() => parseRichText(record), [record.text, record.facets]);
  const children = segments.map((segment, index) => {
    const { text, feature } = segment;
    if (!feature || disableLinks) return text;
    if (isMentionFeature(feature)) {
      if (renderMention) {
        return /* @__PURE__ */ jsx("span", { className: classNames?.mention, children: renderMention({ text, did: feature.did, feature }) }, index);
      }
      return /* @__PURE__ */ jsx(
        DefaultMention,
        {
          text,
          did: feature.did,
          mentionUrl,
          className: classNames?.mention,
          linkProps
        },
        index
      );
    }
    if (isLinkFeature(feature)) {
      if (renderLink) {
        return /* @__PURE__ */ jsx("span", { className: classNames?.link, children: renderLink({ text, uri: feature.uri, feature }) }, index);
      }
      return /* @__PURE__ */ jsx(
        DefaultLink,
        {
          text,
          uri: feature.uri,
          linkUrl,
          className: classNames?.link,
          linkProps
        },
        index
      );
    }
    if (isTagFeature(feature)) {
      if (renderTag) {
        return /* @__PURE__ */ jsx("span", { className: classNames?.tag, children: renderTag({ text, tag: feature.tag, feature }) }, index);
      }
      return /* @__PURE__ */ jsx(
        DefaultTag,
        {
          text,
          tag: feature.tag,
          tagUrl,
          className: classNames?.tag,
          linkProps
        },
        index
      );
    }
    return text;
  });
  return /* @__PURE__ */ jsx("span", { className: classNames?.root, ...spanProps, children });
}

// src/richtext/RichTextEditor.tsx
import {
  useEffect as useEffect2,
  useImperativeHandle as useImperativeHandle2,
  useMemo as useMemo2
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { History } from "@tiptap/extension-history";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Placeholder } from "@tiptap/extension-placeholder";
import { RichText as AtpRichText } from "@atproto/api";

// src/richtext/extensions/BskyMention.ts
import { Mention } from "@tiptap/extension-mention";

// src/richtext/createSuggestionRenderer.ts
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
import { ReactRenderer } from "@tiptap/react";

// src/richtext/MentionSuggestionList.tsx
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
var defaultClassNames = {
  root: "flex flex-col max-h-80 overflow-y-auto bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] min-w-60",
  item: "flex items-center gap-3 w-full px-3 py-2 text-left cursor-pointer border-none bg-transparent hover:bg-[var(--muted)] select-none text-[var(--foreground)]",
  itemSelected: "bg-[var(--muted)]",
  avatar: "flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[var(--muted)] flex items-center justify-center",
  avatarImg: "block w-full h-full object-cover",
  avatarPlaceholder: "flex items-center justify-center w-full h-full text-[var(--muted-foreground)] font-medium text-xs",
  text: "flex flex-col flex-1 min-w-0 overflow-hidden",
  name: "block truncate font-medium text-sm",
  handle: "block truncate text-xs text-[var(--muted-foreground)]",
  empty: "block px-3 py-2 text-sm text-[var(--muted-foreground)]"
};
function cn(base, extra) {
  if (!base && !extra) return void 0;
  return [base, extra].filter(Boolean).join(" ");
}
var MentionSuggestionList = forwardRef(
  function MentionSuggestionListImpl({ items, command, showAvatars = true, noResultsText = "No results", classNames: classNamesProp }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const merged = { ...defaultClassNames, ...classNamesProp };
    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);
    const selectItem = (index) => {
      const item = items[index];
      if (item) command({ id: item.handle });
    };
    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      }
    }));
    return /* @__PURE__ */ jsx2("div", { className: merged.root, onMouseDown: (e) => e.preventDefault(), children: items.length === 0 ? /* @__PURE__ */ jsx2("div", { className: merged.empty, children: noResultsText }) : items.map((item, index) => {
      const isSelected = index === selectedIndex;
      return /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          className: isSelected ? cn(merged.item, merged.itemSelected) : merged.item,
          onMouseEnter: () => setSelectedIndex(index),
          onClick: () => selectItem(index),
          children: [
            showAvatars && /* @__PURE__ */ jsx2("span", { className: merged.avatar, children: item.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              /* @__PURE__ */ jsx2("img", { src: item.avatarUrl, alt: item.displayName ?? item.handle, className: merged.avatarImg })
            ) : /* @__PURE__ */ jsx2("span", { className: merged.avatarPlaceholder, "aria-hidden": "true", children: (item.displayName ?? item.handle).charAt(0).toUpperCase() }) }),
            /* @__PURE__ */ jsxs("span", { className: merged.text, children: [
              item.displayName && /* @__PURE__ */ jsx2("span", { className: merged.name, children: item.displayName }),
              /* @__PURE__ */ jsxs("span", { className: merged.handle, children: [
                "@",
                item.handle
              ] })
            ] })
          ]
        },
        item.did
      );
    }) });
  }
);

// src/richtext/createSuggestionRenderer.ts
function createDefaultSuggestionRenderer(options = {}) {
  return () => {
    let renderer;
    let popup;
    const buildProps = (props) => ({
      ...props,
      showAvatars: options.showAvatars ?? true,
      noResultsText: options.noResultsText ?? "No results",
      ...options.classNames !== void 0 ? { classNames: options.classNames } : {}
    });
    return {
      onStart(props) {
        renderer = new ReactRenderer(MentionSuggestionList, {
          props: buildProps(props),
          editor: props.editor
        });
        if (!props.clientRect) return;
        const clientRect = props.clientRect;
        popup = document.createElement("div");
        popup.style.position = "fixed";
        popup.style.zIndex = "9999";
        popup.appendChild(renderer.element);
        document.body.appendChild(popup);
        const virtualEl = { getBoundingClientRect: () => clientRect?.() ?? new DOMRect() };
        void computePosition(virtualEl, popup, {
          placement: "bottom-start",
          middleware: [offset(8), flip(), shift({ padding: 8 })]
        }).then(({ x, y }) => {
          if (popup) {
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
          }
        });
      },
      onUpdate(props) {
        renderer?.updateProps(buildProps(props));
        if (!props.clientRect || !popup) return;
        const clientRect = props.clientRect;
        const virtualEl = { getBoundingClientRect: () => clientRect?.() ?? new DOMRect() };
        void computePosition(virtualEl, popup, {
          placement: "bottom-start",
          middleware: [offset(8), flip(), shift({ padding: 8 })]
        }).then(({ x, y }) => {
          if (popup) {
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
          }
        });
      },
      onKeyDown(props) {
        if (props.event.key === "Escape") {
          if (popup) popup.style.display = "none";
          return true;
        }
        return renderer?.ref?.onKeyDown(props) ?? false;
      },
      onExit() {
        popup?.remove();
        renderer?.destroy();
        popup = void 0;
        renderer = void 0;
      }
    };
  };
}

// src/richtext/extensions/BskyMention.ts
function createBskyMentionExtension({
  onMentionQuery,
  renderSuggestionList,
  defaultRendererOptions,
  mentionClass = "bsky-mention"
}) {
  const render = renderSuggestionList ?? createDefaultSuggestionRenderer(defaultRendererOptions);
  return Mention.configure({
    HTMLAttributes: { class: mentionClass },
    renderLabel({ options, node }) {
      const handle = node.attrs["label"] ?? node.attrs["id"] ?? "";
      return `${options.suggestion.char ?? "@"}${handle}`;
    },
    suggestion: {
      char: "@",
      allowSpaces: false,
      startOfLine: false,
      items: async ({ query }) => {
        if (!query) return [];
        try {
          const results = await onMentionQuery(query);
          return results.slice(0, 8);
        } catch {
          return [];
        }
      },
      ...render !== void 0 ? { render } : {}
    }
  });
}

// src/richtext/extensions/BskyLinkDecorator.ts
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
var URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
function getDecorations(doc, linkClass) {
  const decorations = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    URL_REGEX.lastIndex = 0;
    let match;
    while ((match = URL_REGEX.exec(text)) !== null) {
      let uri = match[0];
      const from = pos + match.index;
      let to = from + uri.length;
      if (/[.,;!?]$/.test(uri)) {
        uri = uri.slice(0, -1);
        to--;
      }
      if (/[)]$/.test(uri) && !uri.includes("(")) {
        uri = uri.slice(0, -1);
        to--;
      }
      decorations.push(
        Decoration.inline(from, to, { class: linkClass, "data-autolink": "" })
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}
function createLinkDecoratorPlugin(linkClass) {
  const key = new PluginKey("bsky-link-decorator");
  return new Plugin({
    key,
    state: {
      init: (_, { doc }) => getDecorations(doc, linkClass),
      apply: (transaction, decorationSet) => {
        if (transaction.docChanged) return getDecorations(transaction.doc, linkClass);
        return decorationSet.map(transaction.mapping, transaction.doc);
      }
    },
    props: {
      decorations(state) {
        return key.getState(state);
      }
    }
  });
}
var BskyLinkDecorator = Extension.create({
  name: "bskyLinkDecorator",
  addOptions() {
    return { linkClass: "autolink" };
  },
  addProseMirrorPlugins() {
    return [createLinkDecoratorPlugin(this.options.linkClass)];
  }
});

// src/richtext/extensions/BskyTagDecorator.ts
import { Extension as Extension2 } from "@tiptap/core";
import { Plugin as Plugin2, PluginKey as PluginKey2 } from "@tiptap/pm/state";
import { Decoration as Decoration2, DecorationSet as DecorationSet2 } from "@tiptap/pm/view";
var TAG_REGEX = /(?<!\w)#(\p{L}|\p{M}|\p{N}|\p{Pc})+(?!\w)/gu;
function getDecorations2(doc, tagClass) {
  const decorations = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    TAG_REGEX.lastIndex = 0;
    let match;
    while ((match = TAG_REGEX.exec(text)) !== null) {
      const from = pos + match.index;
      const to = from + match[0].length;
      decorations.push(
        Decoration2.inline(from, to, { class: tagClass, "data-hashtag": "" })
      );
    }
  });
  return DecorationSet2.create(doc, decorations);
}
function createTagDecoratorPlugin(tagClass) {
  const key = new PluginKey2("bsky-tag-decorator");
  return new Plugin2({
    key,
    state: {
      init: (_, { doc }) => getDecorations2(doc, tagClass),
      apply: (transaction, decorationSet) => {
        if (transaction.docChanged) return getDecorations2(transaction.doc, tagClass);
        return decorationSet.map(transaction.mapping, transaction.doc);
      }
    },
    props: {
      decorations(state) {
        return key.getState(state);
      }
    }
  });
}
var BskyTagDecorator = Extension2.create({
  name: "bskyTagDecorator",
  addOptions() {
    return { tagClass: "bsky-tag" };
  },
  addProseMirrorPlugins() {
    return [createTagDecoratorPlugin(this.options.tagClass)];
  }
});

// src/richtext/RichTextEditor.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function toInitialHTML(value) {
  if (!value) return "";
  if (typeof value === "string") {
    return `<p>${escapeHTML(value)}</p>`;
  }
  const { text, facets } = value;
  if (!facets?.length) {
    return `<p>${escapeHTML(text)}</p>`;
  }
  const atpFacets = facets;
  const rt = new AtpRichText(atpFacets ? { text, facets: atpFacets } : { text });
  let html = "";
  for (const segment of rt.segments()) {
    if (segment.mention) {
      const handle = segment.text.startsWith("@") ? segment.text.slice(1) : segment.text;
      html += `<span data-type="mention" data-id="${escapeHTML(handle)}"></span>`;
    } else {
      html += escapeHTML(segment.text);
    }
  }
  return `<p>${html}</p>`;
}
function editorJsonToText(json, isLastDocumentChild = false) {
  let text = "";
  if (json.type === "doc") {
    if (json.content?.length) {
      for (let i = 0; i < json.content.length; i++) {
        const node = json.content[i];
        if (!node) continue;
        text += editorJsonToText(node, i === json.content.length - 1);
      }
    }
  } else if (json.type === "paragraph") {
    if (json.content?.length) {
      for (const node of json.content) {
        text += editorJsonToText(node);
      }
    }
    if (!isLastDocumentChild) text += "\n";
  } else if (json.type === "hardBreak") {
    text += "\n";
  } else if (json.type === "text") {
    text += json.text ?? "";
  } else if (json.type === "mention") {
    text += `@${json.attrs?.["id"] ?? ""}`;
  }
  return text;
}
var BSKY_SEARCH_API = "https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors";
async function searchBskyActors(query, limit = 8) {
  if (!query.trim()) return [];
  try {
    const url = new URL(BSKY_SEARCH_API);
    url.searchParams.set("q", query.trim());
    url.searchParams.set("limit", String(limit));
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    return (data.actors ?? []).map((a) => ({
      did: a.did,
      handle: a.handle,
      ...a.displayName !== void 0 ? { displayName: a.displayName } : {},
      ...a.avatar !== void 0 ? { avatarUrl: a.avatar } : {}
    }));
  } catch {
    return [];
  }
}
function createDebouncedSearch(delayMs = 300) {
  let timeoutId = null;
  const pendingResolvers = [];
  return (query) => {
    return new Promise((resolve) => {
      pendingResolvers.push(resolve);
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        timeoutId = null;
        const results = await searchBskyActors(query);
        const toResolve = pendingResolvers.splice(0, pendingResolvers.length);
        for (const r of toResolve) r(results);
      }, delayMs);
    });
  };
}
function RichTextEditor({
  initialValue,
  onChange,
  placeholder,
  onFocus,
  onBlur,
  onMentionQuery,
  mentionSearchDebounceMs = 300,
  disableDefaultMentionSearch = false,
  renderMentionSuggestion,
  mentionSuggestionOptions,
  classNames,
  editorRef,
  editable = true,
  ...divProps
}) {
  const debouncedSearch = useMemo2(
    () => createDebouncedSearch(mentionSearchDebounceMs),
    [mentionSearchDebounceMs]
  );
  const mentionQuery = useMemo2(() => {
    if (onMentionQuery) return onMentionQuery;
    if (disableDefaultMentionSearch) return () => Promise.resolve([]);
    return debouncedSearch;
  }, [onMentionQuery, disableDefaultMentionSearch, debouncedSearch]);
  const linkClass = classNames?.link ?? "autolink";
  const tagClass = classNames?.tag ?? "bsky-tag";
  const mentionClass = classNames?.mention;
  const suggestionClassNames = classNames?.suggestion;
  const extensions = useMemo2(
    () => [
      Document,
      Paragraph,
      Text,
      History,
      HardBreak,
      BskyLinkDecorator.configure({ linkClass }),
      BskyTagDecorator.configure({ tagClass }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
      createBskyMentionExtension({
        onMentionQuery: mentionQuery,
        ...mentionClass !== void 0 ? { mentionClass } : {},
        ...renderMentionSuggestion !== void 0 ? { renderSuggestionList: renderMentionSuggestion } : {},
        ...mentionSuggestionOptions !== void 0 || suggestionClassNames !== void 0 ? {
          defaultRendererOptions: {
            ...mentionSuggestionOptions ?? {},
            ...suggestionClassNames !== void 0 ? { classNames: suggestionClassNames } : {}
          }
        } : {}
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mentionQuery,
      placeholder,
      renderMentionSuggestion,
      mentionSuggestionOptions,
      linkClass,
      tagClass,
      mentionClass,
      JSON.stringify(suggestionClassNames)
    ]
  );
  const editor = useEditor(
    {
      extensions,
      editable,
      content: toInitialHTML(initialValue),
      immediatelyRender: false,
      coreExtensionOptions: {
        clipboardTextSerializer: { blockSeparator: "\n" }
      },
      editorProps: {
        handlePaste(view, event) {
          const clipboardData = event.clipboardData;
          if (!clipboardData) return false;
          if (clipboardData.types.includes("text/html")) {
            const plainText = clipboardData.getData("text/plain");
            view.pasteText(plainText);
            return true;
          }
          return false;
        }
      },
      onFocus() {
        onFocus?.();
      },
      onBlur() {
        onBlur?.();
      },
      onUpdate({ editor: ed }) {
        if (!onChange) return;
        const json = ed.getJSON();
        const text = editorJsonToText(json);
        const rt = new AtpRichText({ text });
        rt.detectFacetsWithoutResolution();
        const record = {
          text: rt.text,
          ...rt.facets?.length ? { facets: rt.facets } : {}
        };
        onChange(record);
      }
    },
    [extensions]
  );
  useEffect2(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);
  useImperativeHandle2(
    editorRef,
    () => ({
      focus() {
        editor?.commands.focus();
      },
      blur() {
        editor?.commands.blur();
      },
      clear() {
        editor?.commands.clearContent(true);
      },
      getText() {
        if (!editor) return "";
        return editorJsonToText(editor.getJSON());
      }
    }),
    [editor]
  );
  return /* @__PURE__ */ jsx3("div", { className: classNames?.root, ...divProps, children: /* @__PURE__ */ jsx3(EditorContent, { editor, className: classNames?.content }) });
}
export {
  MentionSuggestionList,
  RichTextDisplay,
  RichTextEditor,
  createDefaultSuggestionRenderer,
  isLinkFeature,
  isMentionFeature,
  isTagFeature,
  parseRichText
};
//# sourceMappingURL=index.js.map