/**
 * seed.js — Seeds the database with:
 * 1. Assessment templates (CAT-Q, ASRS-v1.1, AQ-10)
 * 2. Demo users (individual + clinician)
 * 
 * Run: node seed.js
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import connectDB from './config/db.js'
import { AssessmentTemplate } from './src/models/Assessment.js'
import User from './src/models/User.js'

const TEMPLATES = [
  {
    name: 'CAT-Q',
    fullName: 'Camouflaging Autistic Traits Questionnaire',
    description: 'Measures social camouflaging and masking behaviours across three domains.',
    sections: ['Compensation', 'Masking', 'Assimilation'],
    questions: [
      { id: 'q1', text: "When I'm in a social situation, I deliberately use a script or set of rules to guide my behaviour.", section: 'Compensation' },
      { id: 'q2', text: 'I have developed a script to use for small talk.', section: 'Compensation' },
      { id: 'q3', text: 'I notice when my social behaviour is not matching that of others around me.', section: 'Masking' },
      { id: 'q4', text: 'I hide my true self in social situations.', section: 'Masking' },
      { id: 'q5', text: 'I adjust my body language to fit in with others.', section: 'Assimilation' },
      { id: 'q6', text: "I work hard to understand others' true intentions and meanings.", section: 'Assimilation' },
      { id: 'q7', text: 'I consciously study and practise expressions and body language.', section: 'Compensation' },
      { id: 'q8', text: 'I always try to behave in a way that is socially expected.', section: 'Masking' },
      { id: 'q9', text: 'I prefer to be in social groups that have consistent, predictable dynamics.', section: 'Assimilation' },
      { id: 'q10', text: 'I monitor my behaviour carefully to make sure it seems "normal".', section: 'Masking' },
    ],
    options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
    maxScore: 50,
    riskBands: [
      { label: 'Low Camouflaging', min: 0, max: 20, color: 'green' },
      { label: 'Moderate Camouflaging', min: 21, max: 35, color: 'amber' },
      { label: 'High Camouflaging', min: 36, max: 50, color: 'rose' },
    ],
    isActive: true,
  },
  {
    name: 'ASRS-v1.1',
    fullName: 'Adult ADHD Self-Report Scale',
    description: 'Screens for adult ADHD symptoms across inattention and hyperactivity/impulsivity domains.',
    sections: ['Inattention', 'Hyperactivity/Impulsivity'],
    questions: [
      { id: 'q1', text: 'How often do you have trouble wrapping up the final details of a project?', section: 'Inattention' },
      { id: 'q2', text: 'How often do you have difficulty getting things in order when you have to do a task that requires organisation?', section: 'Inattention' },
      { id: 'q3', text: 'How often do you have problems remembering appointments or obligations?', section: 'Inattention' },
      { id: 'q4', text: 'How often do you avoid or delay getting started on tasks that require a lot of thought?', section: 'Inattention' },
      { id: 'q5', text: 'How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?', section: 'Hyperactivity/Impulsivity' },
      { id: 'q6', text: 'How often do you feel overly active and compelled to do things, as if driven by a motor?', section: 'Hyperactivity/Impulsivity' },
    ],
    options: ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'],
    maxScore: 24,
    riskBands: [
      { label: 'Low Symptom Burden', min: 0, max: 8, color: 'green' },
      { label: 'Moderate Symptoms', min: 9, max: 16, color: 'amber' },
      { label: 'High Symptom Burden', min: 17, max: 24, color: 'rose' },
    ],
    isActive: true,
  },
  {
    name: 'AQ-10',
    fullName: 'Autism Spectrum Quotient (10-item)',
    description: 'Brief autism screening tool measuring autistic traits across social, attention, and communication domains.',
    sections: ['Social Skills', 'Attention Switching', 'Communication'],
    questions: [
      { id: 'q1', text: 'I often notice small sounds when others do not.', section: 'Attention Switching' },
      { id: 'q2', text: 'I usually concentrate more on the whole picture, rather than the small details.', section: 'Attention Switching' },
      { id: 'q3', text: 'I find it easy to do more than one thing at once.', section: 'Attention Switching' },
      { id: 'q4', text: 'If there is an interruption, I can switch back to what I was doing very quickly.', section: 'Attention Switching' },
      { id: 'q5', text: 'I find it easy to "read between the lines" when someone is talking to me.', section: 'Communication' },
      { id: 'q6', text: 'I know how to tell if someone listening to me is getting bored.', section: 'Social Skills' },
      { id: 'q7', text: "When I'm reading a story, I find it difficult to work out the characters' intentions.", section: 'Communication' },
      { id: 'q8', text: 'I like to collect information about categories of things (e.g. types of car, types of bird, types of train…).', section: 'Social Skills' },
      { id: 'q9', text: 'I find it easy to work out what someone is thinking or feeling just by looking at their face.', section: 'Social Skills' },
      { id: 'q10', text: "I find it difficult to work out people's intentions.", section: 'Communication' },
    ],
    options: ['Definitely Agree', 'Slightly Agree', 'Slightly Disagree', 'Definitely Disagree'],
    maxScore: 10,
    riskBands: [
      { label: 'Below Threshold', min: 0, max: 5, color: 'green' },
      { label: 'Above Threshold — Further Assessment Recommended', min: 6, max: 10, color: 'rose' },
    ],
    isActive: true,
  },
]

const DEMO_USERS = [
  {
    name: 'Alex Rivera',
    email: 'alex@demo.com',
    password: 'demo1234',
    role: 'individual',
    pronouns: 'they/them',
    diagnoses: ['ADHD', 'ASD'],
  },
  {
    name: 'Dr. Morgan Chen',
    email: 'morgan@demo.com',
    password: 'demo1234',
    role: 'clinician',
    pronouns: 'she/her',
  },
  {
    name: 'Jamie Patel',
    email: 'jamie@demo.com',
    password: 'demo1234',
    role: 'individual',
    pronouns: 'he/him',
    diagnoses: ['ADHD'],
  },
]

async function seed() {
  await connectDB()

  console.log('\n🌱 Seeding database...\n')

  // Seed Assessment Templates
  await AssessmentTemplate.deleteMany({})
  const templates = await AssessmentTemplate.insertMany(TEMPLATES)
  console.log(`✅ Seeded ${templates.length} assessment templates`)

  // Seed Demo Users (skip if already exist)
  for (const userData of DEMO_USERS) {
    const existing = await User.findOne({ email: userData.email })
    if (existing) {
      console.log(`⏭️  User ${userData.email} already exists, skipping`)
      continue
    }
    const user = await User.create(userData)
    console.log(`✅ Created demo user: ${user.name} (${user.role}) — invite: ${user.inviteCode || 'N/A'}`)
  }

  // Link Alex and Jamie to Morgan
  const morgan = await User.findOne({ email: 'morgan@demo.com' })
  const alex = await User.findOne({ email: 'alex@demo.com' })
  const jamie = await User.findOne({ email: 'jamie@demo.com' })

  if (morgan && alex && jamie) {
    await User.findByIdAndUpdate(morgan._id, {
      patientIds: [alex._id, jamie._id],
    })
    await User.findByIdAndUpdate(alex._id, { clinicianId: morgan._id })
    await User.findByIdAndUpdate(jamie._id, { clinicianId: morgan._id })
    console.log('✅ Linked Alex & Jamie to Dr. Morgan Chen')
  }

  console.log('\n🎉 Seeding complete!\n')
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err.message)
  process.exit(1)
})
