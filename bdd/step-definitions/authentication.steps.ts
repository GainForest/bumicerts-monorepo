import { Given, When, Then } from "@cucumber/cucumber";
import { Effect } from "effect";
import { strict as assert } from "node:assert";
import type { AtprotoWorld } from "../support/world";

import {
  makeCredentialAgentLayer,
  CredentialLoginError,
} from "../../packages/atproto-mutations-core/src/layers/credential";
import { AtprotoAgent } from "../../packages/atproto-mutations-core/src/services/AtprotoAgent";

// ---------------------------------------------------------------------------
// Given
// ---------------------------------------------------------------------------

Given(
  "credentials with service {string} and identifier {string} and password {string}",
  function (this: AtprotoWorld, service: string, identifier: string, password: string) {
    this.credentials = { service, identifier, password };
  }
);

Given(
  "the password is overridden with {string}",
  function (this: AtprotoWorld, password: string) {
    this.credentials.password = password;
  }
);

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When(
  "I build a credential agent layer",
  function (this: AtprotoWorld) {
    try {
      this.agentLayer = makeCredentialAgentLayer(this.credentials);
      this.storedValues.set("layerCreated", true);
    } catch (error) {
      this.mutationError = error;
      this.storedValues.set("layerCreated", false);
    }
  }
);

When(
  "I check if credentials are complete",
  function (this: AtprotoWorld) {
    const { service, identifier, password } = this.credentials;
    const complete = service !== "" && identifier !== "" && password !== "";
    this.storedValues.set("credentialsComplete", complete);
  }
);

When(
  "I authenticate with the PDS",
  async function (this: AtprotoWorld) {
    if (!this.credentials.service) return "skipped";

    const layer = makeCredentialAgentLayer(this.credentials);
    const program = Effect.gen(function* () {
      const agent = yield* AtprotoAgent;
      const response = yield* Effect.tryPromise(() =>
        agent.com.atproto.repo.describeRepo({
          repo: this.credentials.identifier,
        })
      );
      return response.data;
    }.bind(this));

    try {
      this.mutationResult = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );
      this.isAuthenticated = true;
    } catch (error) {
      this.mutationError = error;
      this.isAuthenticated = false;
    }
  }
);

When(
  "I attempt to authenticate with the PDS",
  async function (this: AtprotoWorld) {
    if (!this.credentials.service) return "skipped";

    const layer = makeCredentialAgentLayer(this.credentials);
    const program = Effect.gen(function* () {
      return yield* AtprotoAgent;
    });

    const result = await Effect.runPromise(
      program.pipe(Effect.provide(layer), Effect.either)
    );

    if (result._tag === "Right") {
      this.mutationResult = result.right;
      this.isAuthenticated = true;
    } else {
      this.mutationError = result.left;
      this.isAuthenticated = false;
    }
  }
);

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then(
  "the layer should be created successfully",
  function (this: AtprotoWorld) {
    assert.strictEqual(this.storedValues.get("layerCreated"), true);
  }
);

Then(
  "the credentials should be incomplete",
  function (this: AtprotoWorld) {
    assert.strictEqual(this.storedValues.get("credentialsComplete"), false);
  }
);

Then(
  "the session should contain a valid DID",
  function (this: AtprotoWorld) {
    assert.ok(this.mutationResult?.did, "Expected a DID in the session");
    assert.ok(
      typeof this.mutationResult.did === "string",
      "DID should be a string"
    );
  }
);

Then(
  "the session should contain the expected handle",
  function (this: AtprotoWorld) {
    assert.strictEqual(
      this.mutationResult?.handle,
      this.credentials.identifier
    );
  }
);

Then(
  "the authentication should fail with a {string}",
  function (this: AtprotoWorld, errorType: string) {
    assert.ok(this.mutationError, `Expected ${errorType} but no error occurred`);
    const actualName =
      this.mutationError?.constructor?.name ?? this.mutationError?._tag ?? "unknown";
    assert.ok(
      actualName.includes(errorType) || this.mutationError?._tag === errorType,
      `Expected "${errorType}" but got "${actualName}"`
    );
  }
);
