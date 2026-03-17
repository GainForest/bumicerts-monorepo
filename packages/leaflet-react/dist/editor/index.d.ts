import * as react_jsx_runtime from 'react/jsx-runtime';
import { m as LeafletLinearDocument, I as ImageUploadResult } from '../index-BA1P_5HV.js';
import { Editor } from '@tiptap/react';

interface LeafletEditorProps {
    /** Initial / controlled content. When changed externally the editor updates. */
    content?: LeafletLinearDocument;
    /** Called on every content change with the updated Leaflet document. */
    onChange: (content: LeafletLinearDocument) => void;
    /**
     * Upload a file to the ATProto PDS and return the resulting CID + a
     * temporary display URL (usually `URL.createObjectURL(file)`).
     */
    onImageUpload: (file: File) => Promise<ImageUploadResult>;
    /**
     * Resolve a blob CID to a displayable URL.
     *
     * @example
     * ```ts
     * resolveImageUrl={(cid) => buildBlobUrl(pdsUrl, did, cid)}
     * ```
     */
    resolveImageUrl: (cid: string) => string;
    /** Placeholder text shown when the editor is empty. */
    placeholder?: string;
    /** Whether the editor is editable. Defaults to `true`. */
    editable?: boolean;
    /** Additional CSS class added to the wrapper `<div>`. */
    className?: string;
}
declare function LeafletEditor({ content, onChange, onImageUpload, resolveImageUrl, placeholder, editable, className, }: LeafletEditorProps): react_jsx_runtime.JSX.Element;

interface EditorToolbarProps {
    editor: Editor | null;
    /**
     * Called when the user selects an image to upload.
     * Should upload the file and return the CID and a temporary display URL.
     */
    onImageUpload: (file: File) => Promise<ImageUploadResult>;
    /** Whether an upload is in progress (controlled externally). */
    isUploading?: boolean;
}
declare function EditorToolbar({ editor, onImageUpload, isUploading: isExternalUploading, }: EditorToolbarProps): react_jsx_runtime.JSX.Element | null;

export { EditorToolbar, type EditorToolbarProps, LeafletEditor, type LeafletEditorProps };
