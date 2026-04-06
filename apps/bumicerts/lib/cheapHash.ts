export const cheapHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const base64Chars: string[] = [];
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  for (let i = 0; i < uint8Array.length; i += 3) {
    const byte1 = uint8Array[i];
    const byte2 = uint8Array[i + 1];
    const byte3 = uint8Array[i + 2];

    const bits24 = (byte1 << 16) | ((byte2 || 0) << 8) | (byte3 || 0);

    base64Chars.push(chars[(bits24 >> 18) & 63]);
    base64Chars.push(chars[(bits24 >> 12) & 63]);

    if (byte2 !== undefined) {
      base64Chars.push(chars[(bits24 >> 6) & 63]);
    }

    if (byte3 !== undefined) {
      base64Chars.push(chars[bits24 & 63]);
    }
  }

  const base64String = base64Chars.join("");
  const targetLength = 32;

  if (base64String.length < targetLength) {
    const paddingNeeded = targetLength - base64String.length;
    return base64String + "0".repeat(paddingNeeded);
  }

  const startSlice = base64String.slice(0, 8);
  const middleSlice = base64String.slice(
    Math.floor(base64String.length / 2) - 4,
    Math.floor(base64String.length / 2) + 4
  );
  const endSlice = base64String.slice(-8);

  return (startSlice + middleSlice + endSlice).slice(0, targetLength);
};
