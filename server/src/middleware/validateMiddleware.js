import { z } from 'zod'

// Middleware factory: validates req.body against a Zod schema
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
    return res.status(400).json({ success: false, error: errors })
  }
  req.body = result.data // Use sanitised/parsed data
  next()
}

// ── Validation Schemas ──────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['individual', 'clinician']),
  pronouns: z.string().optional().default(''),
  diagnoses: z.array(z.string()).optional().default([]),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mood: z.number().int().min(1).max(5),
  executiveFunction: z.number().int().min(1).max(5),
  sensoryOverload: z.number().int().min(1).max(5),
  maskingFatigue: z.number().int().min(1).max(5),
  triggers: z.array(z.string()).optional().default([]),
  journal: z.string().max(5000).optional().default(''),
})

export const assessmentSubmitSchema = z.object({
  templateId: z.string().min(1),
  answers: z.array(z.object({
    questionId: z.string(),
    value: z.number().int().min(0),
  })).min(1),
})

export const clinicalNoteSchema = z.object({
  patientId: z.string().min(1),
  content: z.string().min(1, 'Note content is required').max(10000),
})
