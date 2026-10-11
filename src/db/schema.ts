// src/db/schema.ts
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb, real } from 'drizzle-orm/pg-core';

// Users table authenticated via Firebase Auth
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('dispatcher').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Cleaners & Technicians (15 Mobile Units / Home Hubs)
export const cleaners = pgTable('cleaners', {
  id: text('id').primaryKey(), // cleaner-1 .. cleaner-15
  name: text('name').notNull(),
  vanNumber: text('van_number').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  role: text('role').default('Cleaner').notNull(),
  homeAddress: text('home_address').notNull(),
  color: text('color').notNull(),
  status: text('status').default('AVAILABLE').notNull(),
  rating: real('rating').default(5.0).notNull(),
  skills: jsonb('skills').default([]).notNull(),
  certifications: jsonb('certifications').default([]).notNull(),
  experienceYears: integer('experience_years').default(3).notNull(),
  currentLocation: jsonb('current_location').notNull(),
  depotLocation: jsonb('depot_location').notNull(),
  shiftCapacityHours: integer('shift_capacity_hours').default(8).notNull(),
  completedJobsCount: integer('completed_jobs_count').default(0).notNull(),
  routeMetrics: jsonb('route_metrics'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Service Tickets & Customer Bookings
export const tickets = pgTable('tickets', {
  id: text('id').primaryKey(),
  ticketNumber: text('ticket_number').notNull().unique(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').notNull(),
  urgency: text('urgency').notNull(),
  equipmentType: text('equipment_type').notNull(),
  equipmentModel: text('equipment_model').notNull(),
  faultCode: text('fault_code'),
  issueDescription: text('issue_description').notNull(),
  accessNotes: text('access_notes'),
  assignedTechId: text('assigned_tech_id').references(() => cleaners.id),
  status: text('status').default('UNASSIGNED').notNull(),
  stopSequence: integer('stop_sequence').default(0).notNull(),
  estimatedDurationMinutes: integer('estimated_duration_minutes').default(120).notNull(),
  location: jsonb('location').notNull(),
  slaDeadline: text('sla_deadline').notNull(),
  reportedAt: text('reported_at').notNull(),
  partsRequired: jsonb('parts_required').default([]).notNull(),
  totalAmount: real('total_amount').default(169.0).notNull(),
  syncedToJobber: boolean('synced_to_jobber').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Jobber Sync Configurations & OAuth Tokens
export const jobberConfigs = pgTable('jobber_configs', {
  id: serial('id').primaryKey(),
  accountName: text('account_name').default('TidyUps Cleaning Service Inc.').notNull(),
  clientId: text('client_id'),
  hasSecret: boolean('has_secret').default(false).notNull(),
  redirectUri: text('redirect_uri'),
  accessToken: text('access_token'),
  isConnected: boolean('is_connected').default(true).notNull(),
  isDevSandbox: boolean('is_dev_sandbox').default(false).notNull(),
  lastSyncedAt: text('last_synced_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relationships
export const cleanerRelations = relations(cleaners, ({ many }) => ({
  tickets: many(tickets),
}));

export const ticketRelations = relations(tickets, ({ one }) => ({
  assignedCleaner: one(cleaners, {
    fields: [tickets.assignedTechId],
    references: [cleaners.id],
  }),
}));
