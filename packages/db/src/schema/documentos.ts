import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { documentosSchema, users } from "./public";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const visibilityEnum = documentosSchema.enum("visibility", [
  "public",
  "internal",
  "restricted",
]);

export const documentTypeEnum = documentosSchema.enum("document_type", [
  "edital",
  "legal",
  "fiscal",
  "sop",
  "cargo_description",
  "policy",
  "report",
  "other",
]);

// ---------------------------------------------------------------------------
// documentos.categories — árvore hierárquica (parent_id auto-referência)
// ---------------------------------------------------------------------------
export const categories = documentosSchema.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("categories_slug_idx").on(table.slug),
    index("categories_parent_id_idx").on(table.parentId),
  ],
);

// ---------------------------------------------------------------------------
// documentos.tags
// ---------------------------------------------------------------------------
export const tags = documentosSchema.table(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("tags_slug_idx").on(table.slug)],
);

// ---------------------------------------------------------------------------
// documentos.documents
// ---------------------------------------------------------------------------
export const documents = documentosSchema.table(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    contentMd: text("content_md"),
    fileUrl: text("file_url"),
    visibility: visibilityEnum("visibility").notNull().default("internal"),
    type: documentTypeEnum("type").notNull().default("other"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("documents_slug_idx").on(table.slug),
    index("documents_visibility_idx").on(table.visibility),
    index("documents_type_idx").on(table.type),
    index("documents_published_at_idx").on(table.publishedAt),
    index("documents_author_id_idx").on(table.authorId),
    index("documents_category_id_idx").on(table.categoryId),
  ],
);

// ---------------------------------------------------------------------------
// documentos.document_tags — junction
// ---------------------------------------------------------------------------
export const documentTags = documentosSchema.table(
  "document_tags",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.tagId] })],
);

// ---------------------------------------------------------------------------
// documentos.document_versions
// ---------------------------------------------------------------------------
export const documentVersions = documentosSchema.table(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    contentMd: text("content_md"),
    fileUrl: text("file_url"),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    mimeType: text("mime_type"),
    notes: text("notes"),
    versionNumber: integer("version_number").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("document_versions_document_id_idx").on(table.documentId),
    unique("document_versions_document_version_uniq").on(
      table.documentId,
      table.versionNumber,
    ),
  ],
);

// ---------------------------------------------------------------------------
// documentos.editals — extends documents (1-to-1 via FK on PK)
// ---------------------------------------------------------------------------
export const editals = documentosSchema.table(
  "editals",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => documents.id, { onDelete: "cascade" }),
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    projectType: text("project_type"),
    projectCategoryId: uuid("project_category_id").references(
      () => categories.id,
      { onDelete: "set null" },
    ),
    faq: jsonb("faq").$type<{ q: string; a: string }[]>().notNull().default([]),
  },
  (table) => [
    index("editals_opens_at_idx").on(table.opensAt),
    index("editals_closes_at_idx").on(table.closesAt),
    index("editals_project_category_id_idx").on(table.projectCategoryId),
  ],
);

// ---------------------------------------------------------------------------
// documentos.subscriptions — alertas por categoria
// ---------------------------------------------------------------------------
export const subscriptions = documentosSchema.table(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    onNewVersion: boolean("on_new_version").notNull().default(true),
    onEditalOpen: boolean("on_edital_open").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("subscriptions_user_category_uniq").on(
      table.userId,
      table.categoryId,
    ),
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_category_id_idx").on(table.categoryId),
  ],
);

// ---------------------------------------------------------------------------
// documentos.views — analytics de visualização
// ---------------------------------------------------------------------------
export const views = documentosSchema.table(
  "views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    viewedAt: timestamp("viewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("views_document_id_idx").on(table.documentId),
    index("views_user_id_idx").on(table.userId),
    index("views_viewed_at_idx").on(table.viewedAt),
  ],
);

// ---------------------------------------------------------------------------
// documentos.views_monthly_agg — retenção de views (P-0.13, F3-21)
// documentos.views é dado comportamental pessoal (usuário + timestamp de
// leitura) e crescia sem limite. Um job mensal (documentos.purge_old_views,
// ver migration) agrega linhas com mais de 6 meses aqui e as apaga da
// tabela individual — preserva a métrica editorial sem reter o rastro
// pessoal indefinidamente. Escrita só pela função SQL (conexão de serviço).
// ---------------------------------------------------------------------------
export const viewsMonthlyAgg = documentosSchema.table(
  "views_monthly_agg",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    yearMonth: date("year_month", { mode: "date" }).notNull(),
    viewCount: integer("view_count").notNull().default(0),
  },
  (table) => [
    unique("views_monthly_agg_document_month_uniq").on(
      table.documentId,
      table.yearMonth,
    ),
    index("views_monthly_agg_document_id_idx").on(table.documentId),
  ],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentTag = typeof documentTags.$inferSelect;
export type NewDocumentTag = typeof documentTags.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;
export type Edital = typeof editals.$inferSelect;
export type NewEdital = typeof editals.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type View = typeof views.$inferSelect;
export type NewView = typeof views.$inferInsert;
export type ViewsMonthlyAgg = typeof viewsMonthlyAgg.$inferSelect;
export type NewViewsMonthlyAgg = typeof viewsMonthlyAgg.$inferInsert;
