#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Agent, CredentialSession } from "@atproto/api";
import {
  $parse as parseActorOrganization,
  type Main as ActorOrganizationRecord,
} from "@gainforest/generated/app/certified/actor/organization.defs";
import {
  $parse as parseActorProfile,
  type Main as ActorProfileRecord,
} from "@gainforest/generated/app/certified/actor/profile.defs";
import {
  $parse as parseOrganizationInfo,
  type Main as OrganizationInfoRecord,
  type SocialLink,
} from "@gainforest/generated/app/gainforest/organization/info.defs";
import { countries } from "../lib/countries";

const LEGACY_COLLECTION = "app.gainforest.organization.info";
const PROFILE_COLLECTION = "app.certified.actor.profile";
const ORGANIZATION_COLLECTION = "app.certified.actor.organization";
const SELF_RKEY = "self";

type CliOptions = {
  configPath: string;
  dryRun: boolean;
  force: boolean;
  verbose: boolean;
  serviceOverride?: string;
};

type AccountConfig = {
  handle: string;
  password: string;
  did?: string;
  service?: string;
};

type ExistingRecordStatus<TRecord> =
  | {
      exists: false;
    }
  | {
      exists: true;
      raw: unknown;
      parsed: TRecord | null;
      parseError?: string;
    };

type MigrationPlan = {
  profile: ActorProfileRecord;
  organization: ActorOrganizationRecord;
  countryCode: string;
  locationUri: string;
  mappedSupplementalUrlCount: number;
  warnings: string[];
  omittedFields: string[];
};

function usage(): string {
  return [
    "Usage:",
    "  bun run apps/bumicerts/scripts/migrate-certified-actor.ts --config <path> [--dry-run] [--force] [--verbose] [--service <host>]",
    "",
    "Expected config JSON:",
    '  { "handle": "org.climateai.org", "password": "...", "did": "did:plc:...", "service": "climateai.org" }',
    "",
    "Notes:",
    "  - service is optional; if omitted it is inferred from the handle domain",
    "  - default behavior is safe: if actor records already exist, the script aborts",
    "  - use --force only when you intentionally want to overwrite existing actor records",
  ].join("\n");
}

function exitWithUsage(message?: string): never {
  if (message) {
    console.error(message);
    console.error("");
  }
  console.error(usage());
  process.exit(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function readRequiredString(
  record: Record<string, unknown>,
  key: string,
  sourceName: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName}.${key} must be a non-empty string.`);
  }

  return value.trim();
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
  sourceName: string,
): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${sourceName}.${key} must be a non-empty string when provided.`);
  }

  return value.trim();
}

function parseArgs(args: string[]): CliOptions {
  let configPath: string | undefined;
  let dryRun = false;
  let force = false;
  let verbose = false;
  let serviceOverride: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--config" || argument === "-c") {
      const value = args[index + 1];
      if (!value) {
        exitWithUsage("Missing value for --config.");
      }
      configPath = value;
      index += 1;
      continue;
    }

    if (argument === "--service") {
      const value = args[index + 1];
      if (!value) {
        exitWithUsage("Missing value for --service.");
      }
      serviceOverride = value;
      index += 1;
      continue;
    }

    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (argument === "--force") {
      force = true;
      continue;
    }

    if (argument === "--verbose") {
      verbose = true;
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    }

    exitWithUsage(`Unknown argument: ${argument}`);
  }

  if (!configPath) {
    exitWithUsage("--config is required.");
  }

  return {
    configPath,
    dryRun,
    force,
    verbose,
    serviceOverride,
  };
}

function normalizeServiceHost(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Service host cannot be empty.");
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return new URL(trimmed).host;
  }

  return trimmed;
}

function inferServiceHostFromHandle(handle: string): string {
  const parts = handle.split(".").filter((part) => part.length > 0);
  if (parts.length < 2) {
    throw new Error(
      `Could not infer service host from handle "${handle}". Pass service explicitly in the config or via --service.`,
    );
  }

  return parts.slice(1).join(".");
}

async function readAccountConfig(configPath: string): Promise<AccountConfig> {
  const absolutePath = path.resolve(process.cwd(), configPath);
  const fileContents = await readFile(absolutePath, "utf8");
  const parsed: unknown = JSON.parse(fileContents);

  if (!isRecord(parsed)) {
    throw new Error(`Config at ${absolutePath} must be a JSON object.`);
  }

  return {
    handle: readRequiredString(parsed, "handle", absolutePath),
    password: readRequiredString(parsed, "password", absolutePath),
    did: readOptionalString(parsed, "did", absolutePath),
    service: readOptionalString(parsed, "service", absolutePath),
  };
}

function isRecordMissingError(error: unknown): boolean {
  if (isRecord(error) && typeof error["status"] === "number") {
    return error["status"] === 404;
  }

  const message = stringifyError(error).toLowerCase();
  return message.includes("could not locate record") || message.includes("record not found");
}

async function fetchRecordStatus<TRecord>(options: {
  agent: Agent;
  repo: string;
  collection: string;
  parse: (value: unknown) => TRecord;
}): Promise<ExistingRecordStatus<TRecord>> {
  const { agent, repo, collection, parse } = options;

  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo,
      collection,
      rkey: SELF_RKEY,
    });
    const raw = response.data.value;

    try {
      return {
        exists: true,
        raw,
        parsed: parse(raw),
      };
    } catch (error) {
      return {
        exists: true,
        raw,
        parsed: null,
        parseError: stringifyError(error),
      };
    }
  } catch (error) {
    if (isRecordMissingError(error)) {
      return { exists: false };
    }

    throw new Error(
      `Failed to fetch ${collection}/${SELF_RKEY} from repo ${repo}: ${stringifyError(error)}`,
    );
  }
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

function buildSocialLinkLabel(platform: SocialLink["platform"]): string | undefined {
  const knownLabels: Record<string, string> = {
    twitter: "Twitter",
    instagram: "Instagram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    tiktok: "TikTok",
    github: "GitHub",
    discord: "Discord",
    telegram: "Telegram",
    other: "Social link",
  };

  const label = knownLabels[platform] ?? "Social link";
  return label.length <= 64 ? label : undefined;
}

function buildSupplementalUrls(source: OrganizationInfoRecord): {
  urls: Array<Record<string, string>> | undefined;
  count: number;
} {
  const uniqueUrls = new Map<string, Record<string, string>>();

  const addUrl = (url: string | undefined, label?: string) => {
    const trimmedUrl = url?.trim();
    if (!trimmedUrl || uniqueUrls.has(trimmedUrl)) {
      return;
    }

    const entry: Record<string, string> = { url: trimmedUrl };
    if (label && label.trim().length > 0) {
      entry.label = label.trim();
    }
    uniqueUrls.set(trimmedUrl, entry);
  };

  for (const socialLink of source.socialLinks ?? []) {
    addUrl(socialLink.url, buildSocialLinkLabel(socialLink.platform));
  }

  if (source.email?.trim()) {
    addUrl(`mailto:${source.email.trim()}`, "Email");
  }

  addUrl(source.stripeUrl, "Donate");
  addUrl(source.dataDownloadUrl, "Data download");

  const urls = Array.from(uniqueUrls.values());
  return {
    urls: urls.length > 0 ? urls : undefined,
    count: urls.length,
  };
}

function buildFoundedDate(source: OrganizationInfoRecord): string | undefined {
  if (source.startDate) {
    return source.startDate;
  }

  if (typeof source.foundedYear === "number") {
    return `${source.foundedYear}-01-01T00:00:00.000Z`;
  }

  return undefined;
}

function collectWarnings(source: OrganizationInfoRecord): string[] {
  const warnings: string[] = [];

  if (source.startDate && typeof source.foundedYear === "number") {
    warnings.push(
      `Legacy record includes both startDate (${source.startDate}) and foundedYear (${source.foundedYear}); startDate will be used for actor.organization.foundedDate.`,
    );
  }

  return warnings;
}

function collectOmittedFields(source: OrganizationInfoRecord): string[] {
  const omitted: string[] = [];

  if (source.objectives.length > 0) {
    omitted.push("objectives");
  }

  if (source.discordId?.trim()) {
    omitted.push("discordId");
  }

  if (typeof source.teamSize === "number") {
    omitted.push("teamSize");
  }

  if ((source.ecosystemTypes?.length ?? 0) > 0) {
    omitted.push("ecosystemTypes");
  }

  if ((source.focusSpeciesGroups?.length ?? 0) > 0) {
    omitted.push("focusSpeciesGroups");
  }

  if (source.dataLicense?.trim()) {
    omitted.push("dataLicense");
  }

  if (source.dataDownloadInfo?.trim()) {
    omitted.push("dataDownloadInfo");
  }

  if (source.fundingSourcesDescription?.trim()) {
    omitted.push("fundingSourcesDescription");
  }

  return omitted;
}

function buildProfileRecord(options: {
  source: OrganizationInfoRecord;
  createdAt: string;
}): ActorProfileRecord {
  const { source, createdAt } = options;
  const candidate: Record<string, unknown> = {
    $type: PROFILE_COLLECTION,
    createdAt,
  };

  const displayName = normalizeOptionalText(source.displayName);
  if (displayName) {
    candidate.displayName = displayName;
  }

  const description = normalizeOptionalText(source.shortDescription.text);
  if (description) {
    candidate.description = description;
  }

  if (source.website) {
    candidate.website = source.website;
  }

  if (source.logo) {
    candidate.avatar = { image: source.logo.image };
  }

  if (source.coverImage) {
    candidate.banner = { image: source.coverImage.image };
  }

  return parseActorProfile(candidate);
}

function buildOrganizationRecord(options: {
  source: OrganizationInfoRecord;
  createdAt: string;
}): {
  record: ActorOrganizationRecord;
  countryCode: string;
  locationUri: string;
  mappedSupplementalUrlCount: number;
} {
  const { source, createdAt } = options;
  const countryCode = normalizeCountryCode(source.country);
  const country = countries[countryCode];

  if (!country) {
    throw new Error(
      `No curated Certified location mapping exists for country code "${countryCode}".`,
    );
  }

  const supplementalUrls = buildSupplementalUrls(source);
  const candidate: Record<string, unknown> = {
    $type: ORGANIZATION_COLLECTION,
    createdAt,
    location: {
      uri: country.uri,
      cid: country.cid,
    },
    longDescription: source.longDescription,
    visibility: source.visibility === "Unlisted" ? "unlisted" : "public",
  };

  const foundedDate = buildFoundedDate(source);
  if (foundedDate) {
    candidate.foundedDate = foundedDate;
  }

  if (supplementalUrls.urls) {
    candidate.urls = supplementalUrls.urls;
  }

  return {
    record: parseActorOrganization(candidate),
    countryCode,
    locationUri: country.uri,
    mappedSupplementalUrlCount: supplementalUrls.count,
  };
}

function buildMigrationPlan(options: {
  source: OrganizationInfoRecord;
  existingProfile: ExistingRecordStatus<ActorProfileRecord>;
  existingOrganization: ExistingRecordStatus<ActorOrganizationRecord>;
}): MigrationPlan {
  const profileCreatedAt =
    options.existingProfile.exists && options.existingProfile.parsed
      ? options.existingProfile.parsed.createdAt
      : options.source.createdAt;

  const organizationCreatedAt =
    options.existingOrganization.exists && options.existingOrganization.parsed
      ? options.existingOrganization.parsed.createdAt
      : options.source.createdAt;

  const organization = buildOrganizationRecord({
    source: options.source,
    createdAt: organizationCreatedAt,
  });

  return {
    profile: buildProfileRecord({
      source: options.source,
      createdAt: profileCreatedAt,
    }),
    organization: organization.record,
    countryCode: organization.countryCode,
    locationUri: organization.locationUri,
    mappedSupplementalUrlCount: organization.mappedSupplementalUrlCount,
    warnings: collectWarnings(options.source),
    omittedFields: collectOmittedFields(options.source),
  };
}

function formatRecordStatus<TRecord>(status: ExistingRecordStatus<TRecord>): string {
  if (!status.exists) {
    return "missing";
  }

  if (status.parsed) {
    return "present (valid)";
  }

  return `present (invalid: ${status.parseError ?? "parse failed"})`;
}

function buildWriteAction(options: {
  collection: string;
  exists: boolean;
  value: ActorProfileRecord | ActorOrganizationRecord;
}) {
  if (options.exists) {
    return {
      $type: "com.atproto.repo.applyWrites#update",
      collection: options.collection,
      rkey: SELF_RKEY,
      value: options.value,
    };
  }

  return {
    $type: "com.atproto.repo.applyWrites#create",
    collection: options.collection,
    rkey: SELF_RKEY,
    value: options.value,
  };
}

async function login(options: {
  handle: string;
  password: string;
  serviceHost: string;
}): Promise<Agent> {
  const session = new CredentialSession(new URL(`https://${options.serviceHost}`));
  await session.login({
    identifier: options.handle,
    password: options.password,
  });
  return new Agent(session);
}

function printPlanSummary(options: {
  repo: string;
  handle: string;
  serviceHost: string;
  legacy: OrganizationInfoRecord;
  existingProfile: ExistingRecordStatus<ActorProfileRecord>;
  existingOrganization: ExistingRecordStatus<ActorOrganizationRecord>;
  plan: MigrationPlan;
}) {
  console.log(`Account: ${options.handle}`);
  console.log(`DID: ${options.repo}`);
  console.log(`Service: ${options.serviceHost}`);
  console.log(`Legacy org-info: found (${options.legacy.displayName})`);
  console.log(`Existing actor.profile: ${formatRecordStatus(options.existingProfile)}`);
  console.log(
    `Existing actor.organization: ${formatRecordStatus(options.existingOrganization)}`,
  );
  console.log(
    `Mapped location: ${options.plan.countryCode} -> ${options.plan.locationUri}`,
  );
  console.log(
    `Mapped supplemental URLs: ${options.plan.mappedSupplementalUrlCount}`,
  );

  if (options.plan.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of options.plan.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  if (options.plan.omittedFields.length > 0) {
    console.log(`Omitted legacy-only fields: ${options.plan.omittedFields.join(", ")}`);
  }
}

function ensureSafeToWrite(options: {
  existingProfile: ExistingRecordStatus<ActorProfileRecord>;
  existingOrganization: ExistingRecordStatus<ActorOrganizationRecord>;
  force: boolean;
}) {
  if (options.force) {
    return;
  }

  const blockers: string[] = [];

  if (options.existingProfile.exists) {
    blockers.push("actor.profile already exists");
  }

  if (options.existingOrganization.exists) {
    blockers.push("actor.organization already exists");
  }

  if (blockers.length === 0) {
    return;
  }

  throw new Error(
    `${blockers.join(" and ")}. Refusing to overwrite existing actor records without --force.`,
  );
}

async function main() {
  const cliOptions = parseArgs(process.argv.slice(2));
  const config = await readAccountConfig(cliOptions.configPath);
  const serviceHost = normalizeServiceHost(
    cliOptions.serviceOverride ?? config.service ?? inferServiceHostFromHandle(config.handle),
  );

  const agent = await login({
    handle: config.handle,
    password: config.password,
    serviceHost,
  });
  const repo = agent.assertDid;

  if (config.did && config.did !== repo) {
    throw new Error(
      `Config DID mismatch: expected ${config.did}, but authenticated repo is ${repo}.`,
    );
  }

  const legacyStatus = await fetchRecordStatus({
    agent,
    repo,
    collection: LEGACY_COLLECTION,
    parse: parseOrganizationInfo,
  });

  if (!legacyStatus.exists) {
    throw new Error(
      `${LEGACY_COLLECTION}/${SELF_RKEY} does not exist for repo ${repo}.`,
    );
  }

  if (!legacyStatus.parsed) {
    throw new Error(
      `Legacy ${LEGACY_COLLECTION}/${SELF_RKEY} exists but failed validation: ${legacyStatus.parseError ?? "parse failed"}`,
    );
  }

  const existingProfile = await fetchRecordStatus({
    agent,
    repo,
    collection: PROFILE_COLLECTION,
    parse: parseActorProfile,
  });
  const existingOrganization = await fetchRecordStatus({
    agent,
    repo,
    collection: ORGANIZATION_COLLECTION,
    parse: parseActorOrganization,
  });

  const plan = buildMigrationPlan({
    source: legacyStatus.parsed,
    existingProfile,
    existingOrganization,
  });

  printPlanSummary({
    repo,
    handle: config.handle,
    serviceHost,
    legacy: legacyStatus.parsed,
    existingProfile,
    existingOrganization,
    plan,
  });

  if (cliOptions.verbose) {
    console.log("\nPlanned records:");
    console.log(
      JSON.stringify(
        {
          profile: plan.profile,
          organization: plan.organization,
        },
        null,
        2,
      ),
    );
  }

  if (cliOptions.dryRun) {
    console.log("\nDry run only. No writes performed.");
    return;
  }

  ensureSafeToWrite({
    existingProfile,
    existingOrganization,
    force: cliOptions.force,
  });

  await agent.com.atproto.repo.applyWrites({
    repo,
    writes: [
      buildWriteAction({
        collection: PROFILE_COLLECTION,
        exists: existingProfile.exists,
        value: plan.profile,
      }),
      buildWriteAction({
        collection: ORGANIZATION_COLLECTION,
        exists: existingOrganization.exists,
        value: plan.organization,
      }),
    ],
  });

  const verifiedProfile = await fetchRecordStatus({
    agent,
    repo,
    collection: PROFILE_COLLECTION,
    parse: parseActorProfile,
  });
  const verifiedOrganization = await fetchRecordStatus({
    agent,
    repo,
    collection: ORGANIZATION_COLLECTION,
    parse: parseActorOrganization,
  });

  if (!verifiedProfile.exists || !verifiedProfile.parsed) {
    throw new Error("Post-write verification failed for actor.profile.");
  }

  if (!verifiedOrganization.exists || !verifiedOrganization.parsed) {
    throw new Error("Post-write verification failed for actor.organization.");
  }

  console.log("\nMigration applied successfully.");
  console.log(`Verified ${PROFILE_COLLECTION}/${SELF_RKEY}.`);
  console.log(`Verified ${ORGANIZATION_COLLECTION}/${SELF_RKEY}.`);

  if (cliOptions.verbose) {
    console.log("\nVerified records:");
    console.log(
      JSON.stringify(
        {
          profile: verifiedProfile.parsed,
          organization: verifiedOrganization.parsed,
        },
        null,
        2,
      ),
    );
  }
}

await main().catch((error: unknown) => {
  console.error(`Migration failed: ${stringifyError(error)}`);
  process.exit(1);
});
