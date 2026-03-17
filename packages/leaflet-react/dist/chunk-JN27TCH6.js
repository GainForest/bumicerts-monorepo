// src/serializer/byte-utils.ts
var encoder = new TextEncoder();
var decoder = new TextDecoder();
function byteOffsetAt(text, charIndex) {
  return encoder.encode(text.slice(0, charIndex)).length;
}
function charIndexAtByteOffset(text, byteOffset) {
  const bytes = encoder.encode(text);
  let offset = Math.max(0, Math.min(byteOffset, bytes.length));
  while (offset > 0 && ((bytes[offset] ?? 0) & 192) === 128) {
    offset--;
  }
  return decoder.decode(bytes.slice(0, offset)).length;
}
function clampToCharBoundary(bytes, offset) {
  let o = Math.max(0, Math.min(offset, bytes.length));
  while (o > 0 && ((bytes[o] ?? 0) & 192) === 128) {
    o--;
  }
  return o;
}

export {
  encoder,
  decoder,
  byteOffsetAt,
  charIndexAtByteOffset,
  clampToCharBoundary
};
//# sourceMappingURL=chunk-JN27TCH6.js.map