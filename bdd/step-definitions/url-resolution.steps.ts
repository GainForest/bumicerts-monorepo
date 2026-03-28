import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { AtprotoWorld } from "../support/world";

import {
  resolvePublicUrl,
  isLoopback,
  resolveRequestPublicUrl,
} from "../../packages/atproto-auth-next/src/utils/url";

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given(
  "a request with URL {string}",
  function (this: AtprotoWorld, url: string) {
    this.storedValues.set("requestUrl", url);
  }
);

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When(
  "I resolve the public URL with explicit URL {string}",
  function (this: AtprotoWorld, explicitUrl: string) {
    this.storedValues.set("resolvedUrl", resolvePublicUrl(explicitUrl));
  }
);

When(
  "I resolve the public URL without an explicit URL",
  function (this: AtprotoWorld) {
    this.storedValues.set("resolvedUrl", resolvePublicUrl());
  }
);

When(
  "I check if {string} is a loopback address",
  function (this: AtprotoWorld, url: string) {
    this.storedValues.set("isLoopback", isLoopback(url));
  }
);

When(
  "I resolve the request public URL with fallback {string}",
  function (this: AtprotoWorld, fallback: string) {
    const reqUrl = this.storedValues.get("requestUrl");
    const resolved = resolveRequestPublicUrl({ url: reqUrl }, fallback);
    this.storedValues.set("resolvedUrl", resolved);
  }
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then(
  "the resolved URL should be {string}",
  function (this: AtprotoWorld, expected: string) {
    assert.strictEqual(this.storedValues.get("resolvedUrl"), expected);
  }
);

Then(
  "the result should be true",
  function (this: AtprotoWorld) {
    assert.strictEqual(this.storedValues.get("isLoopback"), true);
  }
);

Then(
  "the result should be false",
  function (this: AtprotoWorld) {
    assert.strictEqual(this.storedValues.get("isLoopback"), false);
  }
);
