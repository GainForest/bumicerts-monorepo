"use server";

import { makeUserAgentLayer } from "@gainforest/atproto-mutations-next/server";
import {
  updateLinkEvmAction,
  deleteLinkEvmAction,
} from "@gainforest/atproto-mutations-next/actions";
import { auth } from "@/lib/auth";

/** Update the optional name label on a linked wallet. */
export async function updateLinkEvmName(rkey: string, name: string | undefined) {
  const agentLayer = makeUserAgentLayer(auth);
  return updateLinkEvmAction(
    {
      rkey,
      data: name !== undefined ? { name } : {},
      unset: name === undefined ? ["name"] : undefined,
    },
    agentLayer
  );
}

/** Delete a linked wallet record entirely. */
export async function deleteLinkEvm(rkey: string) {
  const agentLayer = makeUserAgentLayer(auth);
  return deleteLinkEvmAction({ rkey }, agentLayer);
}
