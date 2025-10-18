import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export function signToken(payload, secret){
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

export function verifyToken(token, secret){
  try { return jwt.verify(token, secret); } catch(e){ return null; }
}

export async function hashPassword(pw){
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(pw, salt);
}

export async function comparePassword(pw, hash){
  return await bcrypt.compare(pw, hash);
}
