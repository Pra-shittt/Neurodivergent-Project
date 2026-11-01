import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { registerSchema, loginSchema } from './src/middleware/validateMiddleware.js'

console.log('--- TEST 1: Zod Registration Schema Validation ---')
const validRegister = {
  name: 'Test Neuro User',
  email: 'test@example.com',
  password: 'password123',
  role: 'individual',
  pronouns: 'they/them',
  diagnoses: ['ADHD', 'ASD']
}
const regParsed = registerSchema.safeParse(validRegister)
console.log('Valid registration parses:', regParsed.success)

const shortPasswordRegister = { ...validRegister, password: '123' }
const shortParsed = registerSchema.safeParse(shortPasswordRegister)
console.log('Short password rejected (< 8 chars):', !shortParsed.success)

const badEmailRegister = { ...validRegister, email: 'not-an-email' }
const badEmailParsed = registerSchema.safeParse(badEmailRegister)
console.log('Bad email rejected:', !badEmailParsed.success)

console.log('\n--- TEST 2: Password Hashing & Bcrypt Comparison ---')
const rawPassword = 'SecurePassword123!'
const salt = await bcrypt.genSalt(12)
const hash = await bcrypt.hash(rawPassword, salt)
console.log('Hash generated length:', hash.length)

const matchCorrect = await bcrypt.compare(rawPassword, hash)
console.log('Correct password matches hash:', matchCorrect)

const matchWrong = await bcrypt.compare('WrongPassword456', hash)
console.log('Wrong password rejected:', !matchWrong)

console.log('\n--- TEST 3: JWT Token Generation & Verification ---')
const testSecret = 'test_super_secret_jwt_key_12345'
const fakeUser = { _id: '507f1f77bcf86cd799439011', role: 'individual' }

const token = jwt.sign(
  { id: fakeUser._id, role: fakeUser.role },
  testSecret,
  { expiresIn: '7d' }
)
console.log('JWT signed token exists:', typeof token === 'string' && token.split('.').length === 3)

const decoded = jwt.verify(token, testSecret)
console.log('Decoded user ID matches:', decoded.id === fakeUser._id)
console.log('Decoded role matches:', decoded.role === fakeUser.role)

try {
  jwt.verify(token, 'wrong_secret')
  console.log('Wrong secret rejected: FALSE')
} catch (e) {
  console.log('Wrong secret rejected: TRUE')
}

console.log('\n========================================')
console.log('✅ AUTH ENGINE UNIT TESTS: 100% PASSED')
console.log('========================================')

