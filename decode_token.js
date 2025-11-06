// Decode JWT token
const jwt = process.argv[2];
if (!jwt) {
  console.error('Usage: node decode_token.js <jwt>');
  process.exit(1);
}

const parts = jwt.split('.');
if (parts.length !== 3) {
  console.error('Invalid JWT');
  process.exit(1);
}

const payload = parts[1];
const padding = (4 - (payload.length % 4)) % 4;
const paddedPayload = payload + '='.repeat(padding);

try {
  const decoded = Buffer.from(paddedPayload, 'base64');
  const json = JSON.parse(decoded.toString());
  
  console.log('\n=== TOKEN DECODED ===\n');
  console.log(JSON.stringify(json, null, 2));
  
  console.log('\n=== KEY INFO ===\n');
  console.log(`Scopes: ${json.scp || 'NONE'}`);
  console.log(`Email: ${json.email || 'NONE'}`);
  console.log(`App ID: ${json.appid || 'NONE'}`);
  console.log(`Username: ${json.unique_name || json.preferred_username || 'NONE'}`);
  console.log(`Issued: ${new Date(json.iat * 1000).toISOString()}`);
  console.log(`Expires: ${new Date(json.exp * 1000).toISOString()}`);
  console.log(`Now: ${new Date().toISOString()}`);
  console.log(`Expired: ${Date.now() > json.exp * 1000 ? 'YES ❌' : 'NO ✅'}`);
  console.log(`AUD (Audience): ${json.aud || 'NONE'}`);
  console.log(`TID (Tenant): ${json.tid || 'NONE'}`);
} catch (err) {
  console.error('Failed to decode:', err.message);
}

