/**
 * Tap WebSocket consumer.
 *
 * Connects to a Tap instance for verified AT Protocol sync.
 * Tap handles: backfill, cursor management, reconnection, verification.
 */

import { Tap, SimpleIndexer, type TapChannel } from "@atproto/tap";
import type { EventHandler } from "./handler.ts";

export type TapStatus = "idle" | "running" | "stopped";

export class TapConsumer {
  private readonly tap: Tap;
  private readonly handler: EventHandler;
  private channel: TapChannel | null = null;

  status: TapStatus = "idle";

  constructor(options: {
    tapUrl: string;
    adminPassword?: string;
    handler: EventHandler;
  }) {
    this.tap = new Tap(options.tapUrl, {
      adminPassword: options.adminPassword,
    });
    this.handler = options.handler;
  }

  async start(): Promise<void> {
    this.status = "running";

    const indexer = new SimpleIndexer();

    indexer.record(async (evt) => {
      if (evt.action === "create") {
        this.handler.handleCreate(evt);
      } else if (evt.action === "update") {
        this.handler.handleUpdate(evt);
      } else if (evt.action === "delete") {
        this.handler.handleDelete(evt);
      }
    });

    indexer.identity(async (evt) => {
      if (!evt.isActive) {
        await this.handler.handleAccountTombstone(evt);
      }
    });

    indexer.error((err) => {
      console.error("[tap] Error:", err);
    });

    this.channel = this.tap.channel(indexer);

    // This promise resolves when the channel is destroyed (on stop())
    await this.channel.start();
  }

  async stop(): Promise<void> {
    this.status = "stopped";
    if (this.channel) {
      await this.channel.destroy();
      this.channel = null;
    }
  }

  /**
   * Add repos to track (triggers backfill for each).
   */
  async addRepos(dids: string[]): Promise<void> {
    await this.tap.addRepos(dids);
  }

  /**
   * Remove repos from tracking.
   */
  async removeRepos(dids: string[]): Promise<void> {
    await this.tap.removeRepos(dids);
  }

  /**
   * Get the underlying Tap client for direct API access.
   */
  getTap(): Tap {
    return this.tap;
  }
}
