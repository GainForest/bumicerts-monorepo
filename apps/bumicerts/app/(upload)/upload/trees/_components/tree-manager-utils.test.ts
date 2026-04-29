import { describe, expect, test } from "bun:test";
import {
  capCanopyCoverPercentInput,
  validateMeasurementDraft,
  type TreeMeasurementDraft,
} from "./tree-manager-utils";

const EMPTY_MEASUREMENT_DRAFT: TreeMeasurementDraft = {
  dbh: "",
  totalHeight: "",
  diameter: "",
  canopyCoverPercent: "",
};

function draftWithCanopyCover(value: string): TreeMeasurementDraft {
  return {
    ...EMPTY_MEASUREMENT_DRAFT,
    canopyCoverPercent: value,
  };
}

describe("capCanopyCoverPercentInput", () => {
  test("keeps canopy cover values from 0 through 100 unchanged", () => {
    expect(capCanopyCoverPercentInput("")).toBe("");
    expect(capCanopyCoverPercentInput("0")).toBe("0");
    expect(capCanopyCoverPercentInput("50")).toBe("50");
    expect(capCanopyCoverPercentInput("99.5")).toBe("99.5");
    expect(capCanopyCoverPercentInput("100")).toBe("100");
  });

  test("caps finite canopy cover values above 100", () => {
    expect(capCanopyCoverPercentInput("100.1")).toBe("100");
    expect(capCanopyCoverPercentInput("101")).toBe("100");
    expect(capCanopyCoverPercentInput("250")).toBe("100");
  });

  test("leaves invalid numeric input for validation to report", () => {
    expect(capCanopyCoverPercentInput("abc")).toBe("abc");
  });
});

describe("validateMeasurementDraft", () => {
  test("accepts canopy cover values from 0 through 100", () => {
    expect(validateMeasurementDraft(draftWithCanopyCover("0"))).toBeNull();
    expect(validateMeasurementDraft(draftWithCanopyCover("50"))).toBeNull();
    expect(validateMeasurementDraft(draftWithCanopyCover("99.5"))).toBeNull();
    expect(validateMeasurementDraft(draftWithCanopyCover("100"))).toBeNull();
  });

  test("rejects canopy cover values above 100", () => {
    expect(validateMeasurementDraft(draftWithCanopyCover("100.1"))).toBe(
      "Canopy cover must be a number less than or equal to 100.",
    );
    expect(validateMeasurementDraft(draftWithCanopyCover("101"))).toBe(
      "Canopy cover must be a number less than or equal to 100.",
    );
  });

  test("rejects negative and non-numeric canopy cover values", () => {
    expect(validateMeasurementDraft(draftWithCanopyCover("-0.1"))).toBe(
      "Canopy cover must be a number greater than or equal to 0.",
    );
    expect(validateMeasurementDraft(draftWithCanopyCover("abc"))).toBe(
      "Canopy cover must be a valid number.",
    );
  });
});
