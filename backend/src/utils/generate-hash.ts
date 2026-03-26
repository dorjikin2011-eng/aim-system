// backend/generate-hash.ts
import * as bcrypt from 'bcryptjs';

const password = 'password';
const hash = bcrypt.hashSync(password, 10);
console.log('Hash for "password":', hash);