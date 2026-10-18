import mongoose from 'mongoose'

const clinicalNoteSchema = new mongoose.Schema(
  {
    clinicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
)

export default mongoose.model('ClinicalNote', clinicalNoteSchema)
