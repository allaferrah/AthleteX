const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing — uploads will fail");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
