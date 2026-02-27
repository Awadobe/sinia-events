const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^["'](.*)["']$/, '$1'); // Remove quotes
  }
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
async function fixDB() {
  const { data: events, error } = await supabase.from('events').select('id, title, slug, status');
  if (error) { console.error('Select error:', error); return; }
  for (const event of events) {
    const newSlug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error: updateError } = await supabase.from('events').update({ slug: newSlug, status: 'published' }).eq('id', event.id);
    if (updateError) console.error(`Update error for ${event.id}:`, updateError);
    else console.log(`Updated ${event.id} to published with slug ${newSlug}`);
  }
  console.log('Fixed DB');
}
fixDB();
