import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const councilorRole = pgEnum("councilor_role", ["COUNCILOR", "STAFF"]);
export const opinionEventType = pgEnum("opinion_event_type", [
  "SUBMITTED",
  "DELIVERED",
  "VIEWED",
]);
export const opinionEventActorType = pgEnum("opinion_event_actor_type", [
  "SYSTEM",
  "COUNCILOR",
  "STAFF",
]);

export const opinions = pgTable(
  "opinions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title"),
    body: text("body").notNull(),
    category: text("category"),
    region: text("region"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("opinions_created_at_idx").on(table.createdAt)],
);

export const opinionContacts = pgTable("opinion_contacts", {
  opinionId: uuid("opinion_id")
    .primaryKey()
    .references(() => opinions.id, { onDelete: "restrict" }),
  emailEncrypted: text("email_encrypted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const opinionAccessTokens = pgTable(
  "opinion_access_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opinionId: uuid("opinion_id")
      .notNull()
      .references(() => opinions.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("opinion_access_tokens_hash_uq").on(table.tokenHash),
    index("opinion_access_tokens_opinion_idx").on(table.opinionId),
    check("opinion_access_tokens_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);

export const opinionAccessSessions = pgTable(
  "opinion_access_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opinionId: uuid("opinion_id")
      .notNull()
      .references(() => opinions.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("opinion_access_sessions_hash_uq").on(table.tokenHash),
    index("opinion_access_sessions_opinion_idx").on(table.opinionId),
    check("opinion_access_sessions_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);

export const councilors = pgTable(
  "councilors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    district: text("district"),
    organization: text("organization").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("councilors_active_idx").on(table.isActive)],
);

export const councilorAccounts = pgTable(
  "councilor_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    councilorId: uuid("councilor_id")
      .notNull()
      .references(() => councilors.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: councilorRole("role").notNull(),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("councilor_accounts_email_uq").on(sql`lower(${table.email})`),
    index("councilor_accounts_councilor_idx").on(table.councilorId),
  ],
);

export const councilorSessions = pgTable(
  "councilor_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => councilorAccounts.id, { onDelete: "restrict" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("councilor_sessions_hash_uq").on(table.tokenHash),
    index("councilor_sessions_account_idx").on(table.accountId),
    check("councilor_sessions_expiry_check", sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);

export const opinionRecipients = pgTable(
  "opinion_recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opinionId: uuid("opinion_id")
      .notNull()
      .references(() => opinions.id, { onDelete: "restrict" }),
    councilorId: uuid("councilor_id")
      .notNull()
      .references(() => councilors.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("opinion_recipients_opinion_councilor_uq").on(
      table.opinionId,
      table.councilorId,
    ),
    index("opinion_recipients_councilor_idx").on(table.councilorId),
  ],
);

export const opinionEvents = pgTable(
  "opinion_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    opinionId: uuid("opinion_id")
      .notNull()
      .references(() => opinions.id, { onDelete: "restrict" }),
    recipientId: uuid("recipient_id").references(() => opinionRecipients.id, {
      onDelete: "restrict",
    }),
    type: opinionEventType("type").notNull(),
    actorType: opinionEventActorType("actor_type").notNull(),
    actorId: uuid("actor_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    signature: text("signature"),
    proofVersion: integer("proof_version"),
    payload: jsonb("payload"),
  },
  (table) => [
    index("opinion_events_opinion_occurred_idx").on(table.opinionId, table.occurredAt),
    uniqueIndex("opinion_events_delivery_uq").on(table.opinionId, table.type, table.recipientId),
    uniqueIndex("opinion_events_view_actor_uq").on(table.opinionId, table.type, table.actorId),
  ],
);

export const schema = {
  opinions,
  opinionContacts,
  opinionAccessTokens,
  opinionAccessSessions,
  councilors,
  councilorAccounts,
  councilorSessions,
  opinionRecipients,
  opinionEvents,
};
