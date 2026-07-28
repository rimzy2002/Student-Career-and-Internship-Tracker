const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
// We prefer the secret key (service_role) on the backend for administrative access if needed,
// otherwise fall back to publishable key.
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL or Key is missing in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const testSupabaseConnection = async () => {
  try {
    // Perform a lightweight query to check connection
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && error.code !== 'PGRST116' && error.code !== '42P01' && !error.message?.includes('Could not find the table')) {
      // Ignore "table not found" or empty result errors, as that confirms API connection succeeded
      throw error;
    }
    console.log('✅ Supabase connected successfully.');
  } catch (err) {
    console.error('❌ Failed to connect to Supabase:', err.message);
  }
};

module.exports = {
  supabase,
  testSupabaseConnection
};
