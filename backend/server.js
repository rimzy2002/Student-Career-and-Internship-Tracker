require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/config/db');
const { testSupabaseConnection } = require('./src/config/supabase');

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  // Test database connections after server starts listening
  await testSupabaseConnection();
  // await testConnection(); // Uncomment if you still want to connect to MySQL simultaneously
});
