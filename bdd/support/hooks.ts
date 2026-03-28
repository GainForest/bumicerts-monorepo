import { Before, After, BeforeAll, AfterAll, Status } from "@cucumber/cucumber";
import type { AtprotoWorld } from "./world";

// ---------------------------------------------------------------------------
// Load optional .env.test-credentials
// ---------------------------------------------------------------------------
let envLoaded = false;

BeforeAll(async function () {
  if (envLoaded) return;
  envLoaded = true;

  try {
    const file = Bun.file("packages/atproto-mutations-core/tests/.env.test-credentials");
    const text = await file.text();
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    console.log("  ✓ Loaded .env.test-credentials");
  } catch {
    console.log("  ⓘ No .env.test-credentials found — integration scenarios will skip");
  }
});

// ---------------------------------------------------------------------------
// Per-scenario reset
// ---------------------------------------------------------------------------
Before(function (this: AtprotoWorld) {
  this.reset();
});

// ---------------------------------------------------------------------------
// After hook — log failures for diagnostics
// ---------------------------------------------------------------------------
After(function (this: AtprotoWorld, scenario) {
  if (scenario.result?.status === Status.FAILED) {
    if (this.mutationError) {
      console.log(`  ✗ Mutation error: ${this.mutationError?.message ?? this.mutationError}`);
    }
  }
});

AfterAll(async function () {
  console.log("\n  BDD run complete.\n");
});
