// Netlify serverless function: /.netlify/functions/check-password
// This runs on Netlify's servers — visitors can NEVER see this code or the password.
//
// HOW TO SET YOUR PASSWORD:
//   1. In your Netlify dashboard → Site settings → Environment variables
//   2. Add a variable called:  ADMIN_PASSWORD
//   3. Set its value to whatever password you want (e.g. "mySecretPass99")
//   4. Click Save. That's it — the password never appears in any file.
//
// To CHANGE the password later, just update the environment variable in Netlify.
// No code changes, no redeployment needed (Netlify picks it up within a minute).

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  const { password } = body;
  const correct = process.env.ADMIN_PASSWORD;

  if (!correct) {
    // Environment variable not set — tell the admin to configure it
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'ADMIN_PASSWORD environment variable not set in Netlify dashboard.' })
    };
  }

  if (typeof password !== 'string' || password.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'No password provided.' })
    };
  }

  // Constant-time comparison to prevent timing attacks
  const crypto = require('crypto');
  const a = crypto.createHash('sha256').update(password).digest('hex');
  const b = crypto.createHash('sha256').update(correct).digest('hex');

  // crypto.timingSafeEqual needs Buffers of equal length
  const match = crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

  if (match) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } else {
    // Return 200 either way — the ok:false is what the browser checks.
    // Returning 401 would leak information about the endpoint's purpose.
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
