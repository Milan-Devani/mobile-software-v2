import jwt from 'jsonwebtoken';

const JWT_SECRET = 'super_secure_jwt_secret_key_fixit_repair_system_2026_xyz987';
const token = jwt.sign(
  {
    id: '10000000-0000-0000-0000-000000000004',
    email: 'admin@mobotech.com',
    role: 'ADMIN',
    full_name: 'Shop Owner (Legacy)'
  },
  JWT_SECRET,
  { expiresIn: '1d' }
);

async function test() {
  const resp = await fetch('http://localhost:5000/api/recycle-bin', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log('status:', resp.status);
  const data = await resp.json();
  console.log('response data:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
