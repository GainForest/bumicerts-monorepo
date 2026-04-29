import { useState } from "react";

export function useUriSelection(availableUris: Set<string>) {
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  const selectedContents = Array.from(selectedUris).filter((uri) =>
    availableUris.has(uri),
  );

  const toggleUri = (uri: string) => {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) {
        next.delete(uri);
      } else {
        next.add(uri);
      }
      return next;
    });
  };

  const resetSelection = () => {
    setSelectedUris(new Set());
  };

  return {
    selectedUris,
    selectedContents,
    toggleUri,
    resetSelection,
  };
}
