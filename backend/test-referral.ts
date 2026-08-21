import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

async function test() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No users found");
    return;
  }
  
  const token = jwt.sign({ sub: user.id, mobile: user.mobile, role: user.role }, process.env.JWT_ACCESS_SECRET || 'secret', { expiresIn: '15m' });
  
  const axios = require('axios');
  try {
    const dash = await axios.get('http://localhost:3000/v1/referral/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Dashboard Response:', JSON.stringify(dash.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
  await prisma.$disconnect();
}
test();
