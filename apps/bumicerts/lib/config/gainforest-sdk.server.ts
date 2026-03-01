import { GainForestSDK } from "gainforest-sdk";
import { allowedPDSDomains } from "./gainforest-sdk";
import { atprotoSDK } from "@/lib/atproto";

export const gainforestSdk = new GainForestSDK(allowedPDSDomains, atprotoSDK);
