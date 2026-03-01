-- GainForest AT Protocol Indexer - Database Schema
-- PostgreSQL 14+

-- ============================================================
-- RECORDS TABLE
-- Generic table for all indexed AT Protocol records.
-- All record content is stored as JSONB for flexibility.
-- ============================================================

CREATE TABLE IF NOT EXISTS records (
  -- Primary key: AT-URI (at://did/collection/rkey)
  uri         TEXT        PRIMARY KEY,

  -- AT Protocol identifiers
  did         TEXT        NOT NULL,   -- e.g. did:plc:abc123
  collection  TEXT        NOT NULL,   -- e.g. app.gainforest.dwc.occurrence
  rkey        TEXT        NOT NULL,   -- e.g. 3jzfcijpj2z2a (tid) or "self"

  -- Record content
  record      JSONB       NOT NULL,   -- Full record payload from the PDS
  cid         TEXT        NOT NULL,   -- CID content hash for deduplication/versioning

  -- Timestamps
  indexed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ,            -- Parsed from record.createdAt if present

  -- Constraint: composite uniqueness
  CONSTRAINT records_did_collection_rkey UNIQUE (did, collection, rkey)
);

-- ============================================================
-- BASIC INDEXES
-- ============================================================

-- Filter by collection (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_records_collection
  ON records (collection);

-- Filter by DID (fetch all records by a user)
CREATE INDEX IF NOT EXISTS idx_records_did
  ON records (did);

-- Filter by DID + collection (fetch specific record type for a user)
CREATE INDEX IF NOT EXISTS idx_records_did_collection
  ON records (did, collection);

-- Time-based ordering (recent records first)
CREATE INDEX IF NOT EXISTS idx_records_created_at
  ON records (created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_records_indexed_at
  ON records (indexed_at DESC);

-- GIN index for full JSONB queries (arbitrary field access)
CREATE INDEX IF NOT EXISTS idx_records_record_gin
  ON records USING GIN (record);

-- ============================================================
-- COLLECTION-SPECIFIC JSONB INDEXES
-- Partial indexes for high-value query fields per lexicon.
-- ============================================================

-- app.gainforest.dwc.occurrence
CREATE INDEX IF NOT EXISTS idx_dwc_occurrence_scientific_name
  ON records ((record->>'scientificName'))
  WHERE collection = 'app.gainforest.dwc.occurrence';

CREATE INDEX IF NOT EXISTS idx_dwc_occurrence_kingdom
  ON records ((record->>'kingdom'))
  WHERE collection = 'app.gainforest.dwc.occurrence';

CREATE INDEX IF NOT EXISTS idx_dwc_occurrence_country
  ON records ((record->>'country'))
  WHERE collection = 'app.gainforest.dwc.occurrence';

CREATE INDEX IF NOT EXISTS idx_dwc_occurrence_event_date
  ON records ((record->>'eventDate'))
  WHERE collection = 'app.gainforest.dwc.occurrence';

CREATE INDEX IF NOT EXISTS idx_dwc_occurrence_basis_of_record
  ON records ((record->>'basisOfRecord'))
  WHERE collection = 'app.gainforest.dwc.occurrence';

CREATE INDEX IF NOT EXISTS idx_dwc_occurrence_event_ref
  ON records ((record->>'eventRef'))
  WHERE collection = 'app.gainforest.dwc.occurrence'
    AND record->>'eventRef' IS NOT NULL;

-- app.gainforest.dwc.event
CREATE INDEX IF NOT EXISTS idx_dwc_event_country
  ON records ((record->>'country'))
  WHERE collection = 'app.gainforest.dwc.event';

CREATE INDEX IF NOT EXISTS idx_dwc_event_date
  ON records ((record->>'eventDate'))
  WHERE collection = 'app.gainforest.dwc.event';

CREATE INDEX IF NOT EXISTS idx_dwc_event_parent_ref
  ON records ((record->>'parentEventRef'))
  WHERE collection = 'app.gainforest.dwc.event'
    AND record->>'parentEventRef' IS NOT NULL;

-- app.gainforest.dwc.measurement
CREATE INDEX IF NOT EXISTS idx_dwc_measurement_type
  ON records ((record->>'measurementType'))
  WHERE collection = 'app.gainforest.dwc.measurement';

CREATE INDEX IF NOT EXISTS idx_dwc_measurement_event_ref
  ON records ((record->>'eventRef'))
  WHERE collection = 'app.gainforest.dwc.measurement'
    AND record->>'eventRef' IS NOT NULL;

-- app.gainforest.organization.info
CREATE INDEX IF NOT EXISTS idx_org_info_country
  ON records ((record->>'country'))
  WHERE collection = 'app.gainforest.organization.info';

CREATE INDEX IF NOT EXISTS idx_org_info_visibility
  ON records ((record->>'visibility'))
  WHERE collection = 'app.gainforest.organization.info';

-- app.gainforest.evaluator.evaluation
CREATE INDEX IF NOT EXISTS idx_evaluator_evaluation_subject
  ON records ((record->'subject'->>'uri'))
  WHERE collection = 'app.gainforest.evaluator.evaluation';

-- org.impactindexer.review.comment
CREATE INDEX IF NOT EXISTS idx_review_comment_subject
  ON records ((record->'subject'->>'uri'))
  WHERE collection = 'org.impactindexer.review.comment';

CREATE INDEX IF NOT EXISTS idx_review_comment_reply_to
  ON records ((record->>'replyTo'))
  WHERE collection = 'org.impactindexer.review.comment'
    AND record->>'replyTo' IS NOT NULL;

-- org.impactindexer.review.like
CREATE INDEX IF NOT EXISTS idx_review_like_subject
  ON records ((record->'subject'->>'uri'))
  WHERE collection = 'org.impactindexer.review.like';

-- org.impactindexer.link.attestation
CREATE INDEX IF NOT EXISTS idx_link_attestation_subject
  ON records ((record->'subject'->>'uri'))
  WHERE collection = 'org.impactindexer.link.attestation';

-- ============================================================
-- FULL-TEXT SEARCH INDEXES
-- GIN indexes on generated tsvectors for fast phrase/keyword search.
-- Used by the searchActivities and searchOrganizations GraphQL queries.
-- ============================================================

-- org.hypercerts.claim.activity
-- Searchable fields: title, shortDescription, description
CREATE INDEX IF NOT EXISTS idx_hc_activity_fts
  ON records
  USING GIN (
    to_tsvector(
      'english',
      coalesce(record->>'title', '') || ' ' ||
      coalesce(record->>'shortDescription', '') || ' ' ||
      coalesce(record->>'description', '')
    )
  )
  WHERE collection = 'org.hypercerts.claim.activity';

-- app.gainforest.organization.info
-- Searchable fields: displayName, shortDescription (JSONB cast), longDescription (JSONB cast)
CREATE INDEX IF NOT EXISTS idx_org_info_fts
  ON records
  USING GIN (
    to_tsvector(
      'english',
      coalesce(record->>'displayName', '') || ' ' ||
      coalesce(record->>'shortDescription', '') || ' ' ||
      coalesce(record->>'longDescription', '')
    )
  )
  WHERE collection = 'app.gainforest.organization.info';

-- ============================================================
-- LABELS TABLE
-- Cached quality labels from external AT Protocol labellers.
-- One active label per (subject_did, source_did) pair.
-- The subject_did is the DID of the activity record author.
-- ============================================================

CREATE TABLE IF NOT EXISTS labels (
  id            SERIAL      PRIMARY KEY,

  -- Subject: the DID being labelled (activity record author)
  subject_did   TEXT        NOT NULL,

  -- Source: the labeller DID that issued this label
  source_did    TEXT        NOT NULL,

  -- Label value: "high-quality", "standard", "draft", "likely-test"
  label_value   TEXT        NOT NULL,

  -- When the labeller applied this label (from the label record)
  labeled_at    TIMESTAMPTZ,

  -- When we last synced this label from the labeller API
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active label per subject+source pair
  CONSTRAINT labels_subject_source_unique UNIQUE (subject_did, source_did)
);

-- Efficient lookup by subject DID (used when attaching labels to query results)
CREATE INDEX IF NOT EXISTS idx_labels_subject_did
  ON labels (subject_did);

-- Efficient filtering by label tier (used for labelTier query arg)
CREATE INDEX IF NOT EXISTS idx_labels_value
  ON labels (label_value);

-- ============================================================
-- PDS HOST CACHE
-- Maps DID → PDS service endpoint, used for blob URI generation.
-- Populated lazily from plc.directory on first encounter.
-- No TTL — PDS migrations are rare. Re-fetched only if missing.
-- ============================================================

CREATE TABLE IF NOT EXISTS pds_hosts (
  did         TEXT PRIMARY KEY,
  host        TEXT NOT NULL,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CURSOR TABLE
-- Single-row table to persist the Jetstream cursor so the
-- indexer can resume from where it left off after restarts.
-- ============================================================

CREATE TABLE IF NOT EXISTS cursor (
  id          INTEGER     PRIMARY KEY DEFAULT 1,
  cursor      BIGINT      NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enforce single-row invariant
  CONSTRAINT cursor_single_row CHECK (id = 1)
);
