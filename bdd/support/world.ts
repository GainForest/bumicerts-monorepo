import { World, setWorldConstructor, setDefaultTimeout } from "@cucumber/cucumber";
import { Effect, Either, Layer } from "effect";
import type { AtpAgent } from "@atproto/api";

// ---------------------------------------------------------------------------
// Default timeout — generous for integration tests against PDS
// ---------------------------------------------------------------------------
setDefaultTimeout(30_000);

// ---------------------------------------------------------------------------
// Custom World — shared state across steps within a single scenario
// ---------------------------------------------------------------------------
export class AtprotoWorld extends World {
  // ---------- Authentication ----------
  public credentials: {
    service: string;
    identifier: string;
    password: string;
  } = { service: "", identifier: "", password: "" };

  public agentLayer: Layer.Layer<any, any> | null = null;
  public agent: AtpAgent | null = null;
  public isAuthenticated = false;

  // ---------- Mutation I/O ----------
  public mutationInput: Record<string, any> = {};
  public mutationResult: any = null;
  public mutationError: any = null;

  // ---------- GeoJSON ----------
  public geojsonContent: string = "";
  public geojsonFile: any = null;

  // ---------- Validation ----------
  public validationResult: Either.Either<any, any> | null = null;

  // ---------- Generic storage ----------
  public storedValues: Map<string, any> = new Map();

  /** Reset mutable state (called in Before hook). */
  reset() {
    this.mutationInput = {};
    this.mutationResult = null;
    this.mutationError = null;
    this.geojsonContent = "";
    this.geojsonFile = null;
    this.validationResult = null;
    this.storedValues.clear();
  }
}

setWorldConstructor(AtprotoWorld);
