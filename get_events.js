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
async function getEvents() {
  const { data, error } = await supabase.from('events').select('id, title, slug, status, date');
  if (error) console.error("Error:", error);
  else console.log(JSON.stringify(data, null, 2));
}
getEvents();
