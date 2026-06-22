const { createClient } = require("@supabase/supabase-js");

let client = null;

function getSupabase() {
  if (client) return client;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase credentials not configured");
  }
  client = createClient(supabaseUrl, supabaseKey);
  return client;
}

module.exports = getSupabase;
