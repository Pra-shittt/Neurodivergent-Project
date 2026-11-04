/**
 * triggerDetector.js — Full Neurodivergent Journal Trigger Detection Engine
 * 
 * Implements lexical pattern matching, lemma variations, and domain mapping
 * matching the TRIGGER_TAXONOMY (Sensory, Executive, Social Masking).
 */

export const TRIGGER_TAXONOMY = {
  SENSORY: [
    'light', 'flickering', 'flicker', 'flickered', 'florescent', 'fluorescent', 'glare', 'bright',
    'screen', 'flash', 'strobe', 'blinding', 'sunlight',
    'noise', 'loud', 'siren', 'buzzing', 'humming', 'beeping', 'chatter', 'yelling', 'chewing',
    'clicking', 'overlapping voices', 'echo', 'lawnmower', 'background noise', 'static', 'construction',
    'texture', 'itchy', 'fabric', 'tag', 'tight', 'sticky', 'rough', 'seam', 'scratchy', 'coarse',
    'clothing', 'wet', 'touch', 'physical touch',
    'smell', 'perfume', 'scent', 'fragrance', 'chemical', 'smoke', 'odor', 'stuffy', 'heat', 'cold',
    'humid', 'crowd', 'crowded', 'overcrowded', 'open office'
  ],
  EXECUTIVE: [
    'deadline', 'planning', 'multitasking', 'interruption', 'backlog', 'overwhelmed', 'disorganized',
    'prioritizing', 'priority', 'task switching', 'context switching', 'unplanned', 'last minute',
    'workload', 'time blindness', 'late', 'forgetting', 'forgetful', 'procrastination',
    'decision fatigue', 'brain fog', 'paralysis', 'task paralysis', 'stuck', 'distraction',
    'distracted', 'focus', 'burnout', 'exhausted', "couldn't get anything done",
    'could not get anything done', 'brain felt fried', 'mentally exhausted', 'unable to start',
    "can't get started", 'cannot get started', 'too many things to do', "can't organize my thoughts",
    'cannot organize my thoughts', 'schedule change', 'routine shift', 'vague instructions',
    'clutter', 'disorganization', 'transition', 'paperwork'
  ],
  SOCIAL_MASKING: [
    'meeting', 'small talk', 'presentation', 'eye contact', 'masking', 'peopling', 'forced smile',
    'scripting', 'camouflaging', 'acting normal', 'party', 'gathering', 'networking', 'socializing',
    'crowded room', 'office chatter', 'dinner party', 'group conversation', 'conflict', 'argument',
    'misunderstanding', 'rejection', 'criticism', 'drained', 'social fatigue', 'awkward',
    'pretending', 'fitting in'
  ]
}

// Mapping of keywords and concepts to user-facing primary trigger chips
const PRIMARY_CHIP_RULES = [
  {
    chip: 'Bright lights',
    keywords: ['light', 'lights', 'flickering', 'flicker', 'flickered', 'fluorescent', 'florescent', 'glare', 'bright', 'flash', 'strobe', 'blinding', 'sunlight']
  },
  {
    chip: 'Loud noises',
    keywords: ['noise', 'noises', 'loud', 'siren', 'sirens', 'buzzing', 'humming', 'beeping', 'chatter', 'yelling', 'chewing', 'clicking', 'overlapping voices', 'echo', 'lawnmower', 'background noise', 'static', 'construction']
  },
  {
    chip: 'Crowded spaces',
    keywords: ['crowd', 'crowds', 'crowded', 'overcrowded', 'crowded room', 'open office', 'gathering', 'packed']
  },
  {
    chip: 'Time pressure',
    keywords: ['deadline', 'deadlines', 'time blindness', 'late', 'last minute', 'rush', 'rushed', 'unplanned', 'backlog', 'workload', 'time pressure']
  },
  {
    chip: 'Social demands',
    keywords: ['meeting', 'meetings', 'small talk', 'presentation', 'eye contact', 'masking', 'peopling', 'forced smile', 'scripting', 'camouflaging', 'acting normal', 'party', 'networking', 'socializing', 'social fatigue', 'awkward', 'pretending', 'fitting in', 'conflict', 'argument', 'group conversation']
  },
  {
    chip: 'Unexpected changes',
    keywords: ['unexpected', 'schedule change', 'routine shift', 'transition', 'interruption', 'interruptions', 'vague instructions', 'last minute']
  },
  {
    chip: 'Strong smells',
    keywords: ['smell', 'smells', 'perfume', 'scent', 'scents', 'fragrance', 'chemical', 'chemicals', 'smoke', 'odor', 'stuffy']
  },
  {
    chip: 'Physical touch',
    keywords: ['texture', 'textures', 'itchy', 'fabric', 'tag', 'tags', 'tight', 'sticky', 'rough', 'seam', 'seams', 'scratchy', 'coarse', 'wet', 'touch', 'physical touch']
  },
  {
    chip: 'Screen time',
    keywords: ['screen', 'screens', 'screen time', 'monitor', 'display', 'computer', 'laptop', 'glare', 'blue light']
  },
  {
    chip: 'Multitasking',
    keywords: ['multitasking', 'task switching', 'context switching', 'prioritizing', 'too many things to do', 'disorganized', 'clutter', 'backlog', 'brain fog', 'paralysis', 'task paralysis', 'decision fatigue', "couldn't get anything done", 'unable to start']
  }
]

/**
 * Detect triggers from free-form text.
 * @param {string} text Raw journal entry text
 * @returns {{ matchedTriggers: string[], detectedItems: Array<{ phrase: string, category: string }>, summary: string }}
 */
export function detectTriggersFromText(text) {
  if (!text || typeof text !== 'string') {
    return { matchedTriggers: [], detectedItems: [], summary: '' }
  }

  const normalized = text.toLowerCase()
  const detectedItems = []
  const seenPhrases = new Set()

  // 1. Scan TAXONOMY for exact phrases and keywords
  for (const [category, keywords] of Object.entries(TRIGGER_TAXONOMY)) {
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase()
      // Match whole word or exact multi-word phrase
      const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'i')
      if (regex.test(normalized)) {
        if (!seenPhrases.has(kwLower)) {
          seenPhrases.add(kwLower)
          detectedItems.push({ phrase: kw, category })
        }
      }
    }
  }

  // 2. Map matches to primary trigger chips
  const matchedTriggers = new Set()
  for (const rule of PRIMARY_CHIP_RULES) {
    for (const kw of rule.keywords) {
      const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\b${escaped}\\b`, 'i')
      if (regex.test(normalized)) {
        matchedTriggers.add(rule.chip)
        break
      }
    }
  }

  const triggerList = Array.from(matchedTriggers)
  let summary = ''
  if (triggerList.length > 0) {
    summary = `Detected ${triggerList.length} trigger${triggerList.length > 1 ? 's' : ''}: ${triggerList.join(', ')}`
  }

  return {
    matchedTriggers: triggerList,
    detectedItems,
    summary,
  }
}
