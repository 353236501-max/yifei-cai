// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),topic:text('topic').notNull(),payload:text('payload').notNull(),objectKey:text('object_key'),created:integer('created').notNull(),due:integer('due').notNull(),version:integer('version').notNull().default(0),
},t=>[index('idx_records_owner_due').on(t.owner,t.due)]);
