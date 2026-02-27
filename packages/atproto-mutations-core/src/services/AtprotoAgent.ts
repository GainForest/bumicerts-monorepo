import { Context } from "effect";
import type { Agent } from "@atproto/api";

export class AtprotoAgent extends Context.Tag("AtprotoAgent")<
  AtprotoAgent,
  Agent
>() {}
