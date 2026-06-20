import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const experiences = sqliteTable("experiences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default(""),
  name: text("name").notNull(),
  description: text("description"),
  city: text("city"),
  country: text("country").notNull().default(""),
  idealSeasons: text("ideal_seasons").notNull().default(""), // comma-separated: "spring,summer"
  idealPartnerTypes: text("ideal_partner_types").notNull().default(""), // comma-separated: "solo,romantic"
  estimatedDays: integer("estimated_days"),
  bestMonths: text("best_months"),
  estimatedBudget: text("estimated_budget"),
  doByAge: text("do_by_age"), // "30" | "40" | "50" | "60+"
  status: text("status").notNull().default("wishlist"), // wishlist | planned | visited
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const trips = sqliteTable("trips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().default(""),
  name: text("name").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  season: text("season"), // spring | summer | autumn | winter
  partnerType: text("partner_type"), // solo | romantic | friends | family
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const experiencePhotos = sqliteTable("experience_photos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  experienceId: integer("experience_id")
    .notNull()
    .references(() => experiences.id, { onDelete: "cascade" }),
  unsplashId: text("unsplash_id").notNull(),
  url: text("url").notNull(),
  thumbUrl: text("thumb_url").notNull(),
  altDescription: text("alt_description"),
  photographerName: text("photographer_name").notNull(),
  photographerUrl: text("photographer_url").notNull(),
});

export const tripExperiences = sqliteTable("trip_experiences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: integer("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  experienceId: integer("experience_id")
    .notNull()
    .references(() => experiences.id, { onDelete: "cascade" }),
});

export const buddies = sqliteTable("buddies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🌍"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// tier: "take-me-there" | "interested" | "open"
export const affinities = sqliteTable("affinities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buddyId: integer("buddy_id")
    .notNull()
    .references(() => buddies.id, { onDelete: "cascade" }),
  experienceId: integer("experience_id")
    .notNull()
    .references(() => experiences.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
