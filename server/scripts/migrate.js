import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const allFiles = [
  '../supabase/schema.sql',
  '../supabase/phase2_catalog.sql',
  '../supabase/phase3_inventory.sql',
  '../supabase/phase3_orders.sql',
  '../supabase/phase3_cms.sql',
  '../supabase/phase4_customers.sql',
  '../supabase/phase4_returns.sql',
  '../supabase/phase5_coupons.sql',
  '../supabase/phase5_reports.sql',
  '../supabase/phase5_support.sql',
  '../supabase/phase5_audit_logs.sql',
  '../supabase/phase5_cms_content.sql',
  '../supabase/phase5_maintenance_mode.sql',
  '../supabase/phase5_influencers.sql',
  '../supabase/phase6_marketing.sql',
  '../supabase/phase6_shipping.sql',
  '../supabase/phase6_crm.sql',
  '../supabase/phase6_banner_image.sql',
  '../supabase/phase6_media.sql',
  '../supabase/phase7_barcode_labels.sql',
  '../supabase/phase8_product_specifications.sql',
  '../supabase/phase9_order_payment_method.sql',
  '../supabase/phase10_checkout_schema_gaps.sql',
  '../supabase/phase11_orders_ops.sql',
  '../supabase/phase12_testimonials.sql',
  '../supabase/phase13_support_tickets.sql',
  '../supabase/phase14_whatsapp.sql',
  '../supabase/phase15_inventory_automation.sql',
  '../supabase/phase16_abandoned_carts.sql',
];

// Every statement in server/supabase/*.sql is idempotent (create type/policy/trigger are all
// guarded), so re-running the full list is always safe. Pass specific file names as CLI args
// to run just those instead, e.g. to apply only a newly added phase file.
const files = process.argv.length > 2 ? process.argv.slice(2) : allFiles;

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

for (const file of files) {
  const fullPath = path.join(__dirname, file);
  const sql = readFileSync(fullPath, 'utf8');
  console.log(`Running ${file}...`);
  await client.query(sql);
  console.log(`Done: ${file}`);
}

await client.end();
console.log('Migration complete.');