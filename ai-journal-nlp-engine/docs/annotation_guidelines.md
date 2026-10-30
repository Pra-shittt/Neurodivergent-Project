# Annotation Guidelines
_AI Journal NLP Engine — Trigger Detection_
_Version 1.0 — 2026-10-29_

---

## 1. Purpose

These guidelines ensure consistent, reproducible labelling of journal-style sentences for the three trigger categories: **SENSORY**, **EXECUTIVE**, and **SOCIAL_MASKING**. They also define when to use **NONE** and **REVIEW**.

Every annotator must read these guidelines before labelling any example. All disagreements must be resolved by discussion, not by majority vote alone.

---

## 2. Label Definitions

### SENSORY
Evidence that the writer is experiencing or has experienced distress, discomfort, or overwhelm **caused by a sensory stimulus or sensory environment**.

The text must support:
- A sensory stimulus (sound, light, texture, smell, temperature, crowd density, etc.) AND
- A negative subjective response to that stimulus (discomfort, overwhelm, pain, inability to function, avoidance, etc.)

Both elements must be present or strongly implied. A bare mention of a sensory word is not sufficient.

**Clear SENSORY examples:**
- "The flickering lights gave me a headache and I had to leave the room."
- "The overlapping voices made it impossible for me to think."
- "The scratchy fabric of my collar was all I could focus on."
- "The smell of the cleaning product was so strong it made me nauseous."

**NOT SENSORY — reject these:**
- "I need to buy a new light bulb." (mentions light; no distress)
- "She wore a fabric mask." (fabric mentioned; no sensory distress)
- "There was a lot of noise at the party." (noise mentioned; no evidence the writer was distressed by it)
- "I turned down the music." (neutral description; no evidence of distress)

---

### EXECUTIVE
Evidence that the writer is experiencing or has experienced difficulty with **cognitive self-regulation tasks**: initiating tasks, planning, organising, prioritising, maintaining focus, managing time, completing work, or transitioning between tasks.

The text must support:
- A reference to a cognitive-regulatory task or process AND
- Evidence of struggle, failure, avoidance, overwhelm, or paralysis related to that task

**Clear EXECUTIVE examples:**
- "I kept putting off the assignment even though I wanted to finish it."
- "I had no idea where to start — every task felt equally important and equally impossible."
- "I sat in front of my screen for an hour without starting anything."
- "My brain felt completely fried after switching between five different projects."

**NOT EXECUTIVE — reject these:**
- "I made a to-do list." (mentions planning; no evidence of difficulty)
- "The project deadline is Friday." (mentions a deadline; no evidence of struggle)
- "She organized the shelves alphabetically." (organisation mentioned; no distress)
- "I finished all my tasks early today." (task completion; no evidence of difficulty)

---

### SOCIAL_MASKING
Evidence that the writer is **deliberately hiding, suppressing, or modifying their natural behaviour, reactions, or identity** in order to conform to social expectations or avoid standing out.

The text must support:
- Evidence of a gap between authentic behaviour/feeling and presented behaviour, AND
- Evidence that the gap is deliberate or effortful

This is distinct from general social anxiety or discomfort. The defining feature is the concealment or performance of a false self.

**Clear SOCIAL_MASKING examples:**
- "I rehearsed the whole conversation in my head before the call so I wouldn't sound weird."
- "I pretended to laugh at the joke because everyone else did."
- "I forced myself to make eye contact even though it felt unbearable."
- "I spend the whole workday performing a version of myself that fits in, and I'm exhausted by evening."
- "I mirrored her body language so she wouldn't notice I was uncomfortable."

**NOT SOCIAL_MASKING — reject these:**
- "I went to a party." (social setting; no masking evidence)
- "The meeting was long." (social context; no concealment)
- "I pretended not to hear the question because I was embarrassed." (avoidance, not masking of neurodivergent traits)
- "I won't pretend to understand the chemistry." (figurative use of 'pretend'; no social masking)
- "I felt awkward at the networking event." (social discomfort; no evidence of deliberate concealment)

---

### NONE
Use NONE when **there is sufficient context to assess the sentence and no supported trigger is present**.

NONE is an active label, not a default. You must be confident that the text does not support any trigger.

**Clear NONE examples:**
- "I bought a new notebook yesterday."
- "We had pasta for dinner."
- "My appointment was rescheduled to Thursday."
- "I finished reading the book."
- "The dog kept barking this morning." (sound mentioned; but no evidence the writer was distressed by it)

---

### REVIEW
Use REVIEW when **you cannot confidently assign or exclude a label because the context is insufficient or the meaning is genuinely ambiguous**.

REVIEW is an annotation status, not a trigger category. Sentences labelled REVIEW are **excluded from the primary supervised evaluation** and reported separately.

**Use REVIEW when:**
- The sentence is highly ambiguous and would need surrounding context to resolve.
- Reasonable annotators would disagree after reading the guidelines.
- The sentence contains figurative language that could plausibly be literal or non-literal.

**Examples:**
- "I tried not to stand out." (masking candidate — but also a completely ordinary phrase)
- "I was overwhelmed." (SENSORY or EXECUTIVE candidate — or a general statement; no specifics)
- "Everything felt like too much." (similar ambiguity)
- "I had to be someone else today." (masking candidate — or theatrical/figurative)

---

## 3. Multi-Label Rules

A sentence may receive **more than one trigger label** when the evidence independently supports each.

- Each label must be independently justified.
- Do not assign a second label simply because a first one was found.
- Do not refuse a second label simply because a first one was found.

**Multi-label examples:**
- "The overlapping conversations and the impossible list of tasks left me completely broken." → SENSORY + EXECUTIVE
- "I forced smiles through a noisy room for three hours." → SENSORY + SOCIAL_MASKING

---

## 4. Rules That Apply to Every Example

1. **Label the text, not the source.** The original Reddit class (ADHD, anxiety, etc.) must never automatically determine the trigger label.
2. **A keyword match alone is not sufficient.** The full sentence must support the intended meaning.
3. **Context within the sentence matters.** Negation, figurative language, and hedging must be considered.
4. **Generic terms need meaning support.** Words such as "organization", "fabric", "noise", "meeting", "procrastination", and "social" must be used in a trigger-supporting sense, not merely mentioned.
5. **Negation is not masking.** "I won't pretend to understand X" does not constitute SOCIAL_MASKING.
6. **Do not force every sentence into a trigger category.** Many real sentences are NONE.
7. **Do not claim human review unless it has occurred.** Automatically generated labels are weak labels only.

---

## 5. Label Schema

The gold label column uses a pipe-separated string of category names (uppercase).

| Label value | Meaning |
|-------------|---------|
| `SENSORY` | Sensory trigger supported |
| `EXECUTIVE` | Executive function trigger supported |
| `SOCIAL_MASKING` | Social masking trigger supported |
| `NONE` | Sufficient context, no trigger present |
| `REVIEW` | Ambiguous or insufficient context |
| `SENSORY\|EXECUTIVE` | Both independently supported |
| `SENSORY\|SOCIAL_MASKING` | Both independently supported |
| `EXECUTIVE\|SOCIAL_MASKING` | Both independently supported |

Multi-category combinations must be pipe-separated, uppercase, alphabetically sorted.

---

## 6. Benchmark Creation Rules

- Do not use model predictions to create gold labels.
- Do not use benchmark examples as training data for any model.
- Do not claim benchmark labels have been human-reviewed unless they have.
- Clearly document how each example was created (constructed, sourced, or reviewed).
- A benchmark tuned by repeated model runs is no longer a trustworthy benchmark. Use it once.

---

## 7. Reporting Requirements

- Report per-category precision, recall, and F1.
- Report micro-average and macro-average F1.
- Report exact-match accuracy.
- Report false-positive and false-negative category counts.
- Report NONE-specific precision and recall separately.
- Report the count of REVIEW examples that were excluded.
- State explicitly that the benchmark is controlled/synthetic and not representative of real-world journal data.
