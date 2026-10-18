import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: ['individual', 'clinician'],
      required: true,
    },
    pronouns: {
      type: String,
      default: '',
    },
    diagnoses: {
      type: [String],
      default: [],
    },
    // Individual-specific
    inviteCode: {
      type: String,
      unique: true,
      sparse: true, // Only unique for non-null values
    },
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    privacySettings: {
      shareMetrics: { type: Boolean, default: true },
      shareJournals: { type: Boolean, default: false },
    },
    // Clinician-specific
    patientIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

// Hash password before saving
userSchema.pre('save', async function () {
  if (this.role === 'individual' && !this.inviteCode) {
    const name = (this.name || 'USER').split(' ')[0].toUpperCase().slice(0, 8)
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    this.inviteCode = `${name}-${suffix}`
  }

  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.model('User', userSchema)
