"use client";

import { useState, useCallback } from "react";
import Papa from "papaparse";

type CsvParserState = {
  parsedData: Record<string, string>[];
  headers: string[];
  rowCount: number;
  error: string | null;
  isParsing: boolean;
};

type CsvParserActions = {
  parseFile: (file: File) => void;
  reset: () => void;
};

export type UseCsvParserReturn = CsvParserState & CsvParserActions;

const INITIAL_STATE: CsvParserState = {
  parsedData: [],
  headers: [],
  rowCount: 0,
  error: null,
  isParsing: false,
};

export function useCsvParser(): UseCsvParserReturn {
  const [state, setState] = useState<CsvParserState>(INITIAL_STATE);

  const parseFile = useCallback((file: File) => {
    setState((prev) => ({ ...prev, isParsing: true, error: null }));

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      encoding: "UTF-8",
      complete(results) {
        const headers = results.meta.fields ?? [];
        const parsedData = results.data;

        setState({
          parsedData,
          headers,
          rowCount: parsedData.length,
          error: null,
          isParsing: false,
        });
      },
      error(err) {
        setState((prev) => ({
          ...prev,
          isParsing: false,
          error: err.message,
        }));
      },
    });
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    parseFile,
    reset,
  };
}
