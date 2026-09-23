const bcrypt = require('bcrypt');

const INSECURE_PASSWORDS = new Set([
  'changeme123!',
  'changeme123',
  'changeme',
  'adminpassword123!',
  'adminpassword123',
  'password',
  'password123',
  'password123!',
  'admin',
  'admin123',
  'admin1234',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty1234'
]);

const MIN_PASSWORD_LENGTH = 10;

/**
 * Validates admin bootstrap parameters.
 */
function validateAdminInput({ email, password, firstName, lastName }) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('ADMIN_EMAIL is required.');
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }

  if (!password || typeof password !== 'string') {
    throw new Error('ADMIN_PASSWORD is required.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  if (INSECURE_PASSWORDS.has(password.toLowerCase()) || password.toLowerCase() === trimmedEmail) {
    throw new Error('Insecure or placeholder ADMIN_PASSWORD rejected. Please provide a strong, unique password.');
  }

  return {
    email: trimmedEmail,
    password,
    firstName: (firstName && typeof firstName === 'string' && firstName.trim()) || 'System',
    lastName: (lastName && typeof lastName === 'string' && lastName.trim()) || 'Admin'
  };
}

/**
 * Bootstraps an admin user in Supabase database safely from environment variables.
 *
 * @param {Object} [overrides={}] - Optional credentials override (e.g. for testing)
 * @param {Object} [customClient=null] - Optional Supabase client (e.g. for testing)
 * @returns {Promise<{ success: boolean, status: string, message: string, user?: Object }>}
 */
async function bootstrapAdmin(overrides = {}, customClient = null) {
  const email = overrides.email ?? process.env.ADMIN_EMAIL;
  const password = overrides.password ?? process.env.ADMIN_PASSWORD;
  const firstName = overrides.firstName ?? process.env.ADMIN_FIRST_NAME;
  const lastName = overrides.lastName ?? process.env.ADMIN_LAST_NAME;

  const validated = validateAdminInput({ email, password, firstName, lastName });

  // Use provided client or default Supabase client
  const client = customClient || require('../src/config/supabase').supabase;
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }

  // 1. Check if user already exists
  const { data: existingUsers, error: checkError } = await client
    .from('users')
    .select('id, email, role')
    .eq('email', validated.email);

  if (checkError) {
    throw new Error(`Database error checking existing user: ${checkError.message}`);
  }

  if (existingUsers && existingUsers.length > 0) {
    const existing = existingUsers[0];
    return {
      success: true,
      status: 'already_exists',
      message: `Account with email "${validated.email}" already exists (Role: ${existing.role}). No changes made.`,
      user: { id: existing.id, email: existing.email, role: existing.role }
    };
  }

  // 2. Hash password with bcrypt (10 rounds)
  const passwordHash = await bcrypt.hash(validated.password, 10);

  // 3. Insert new admin user
  const { data: newUser, error: insertError } = await client
    .from('users')
    .insert([
      {
        first_name: validated.firstName,
        last_name: validated.lastName,
        email: validated.email,
        password_hash: passwordHash,
        role: 'admin'
      }
    ])
    .select('id, email, role')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        success: true,
        status: 'already_exists',
        message: `Account with email "${validated.email}" already exists. No changes made.`
      };
    }
    throw new Error(`Database error creating admin user: ${insertError.message}`);
  }

  return {
    success: true,
    status: 'created',
    message: `Admin account created successfully for "${newUser.email}" (ID: ${newUser.id}, Role: ${newUser.role}).`,
    user: { id: newUser.id, email: newUser.email, role: newUser.role }
  };
}

// Direct CLI entry point
if (require.main === module) {
  require('dotenv').config();

  bootstrapAdmin()
    .then((result) => {
      console.log(result.message);
      process.exit(0);
    })
    .catch((err) => {
      console.error(`❌ Admin bootstrap failed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  bootstrapAdmin,
  validateAdminInput,
  MIN_PASSWORD_LENGTH,
  INSECURE_PASSWORDS
};
