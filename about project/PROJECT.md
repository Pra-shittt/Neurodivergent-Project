# Project Overview: Gender-Neutral Neurodiversity Portal (ASD & ADHD)

## Core Vision
A web application designed for neurodivergent individuals (ASD & ADHD) and their clinicians. It focuses on diagnostic tracking, social camouflaging/masking evaluation, executive function tracking, and sensory overload monitoring using an inclusive, gender-neutral approach.

## Key Target Personas
1. **INDIVIDUAL (Patient / Self-Advocate)**
   - Completes psychometric assessments (CAT-Q, ASRS, AQ-10).
   - Logs daily metrics (1-5 sliders for mood, executive function, sensory overload, masking fatigue).
   - Tracks environmental triggers and free-text daily journals.
   - Views longitudinal trend charts and exports reports for appointments.
   - Manages privacy settings and clinician sharing via unique invite codes.

2. **CLINICIAN (Therapist / Psychiatrist)**
   - Monitors assigned patient roster.
   - Reviews aggregate patient metrics, test scores, and trend graphs (respecting patient privacy toggles).
   - Receives automatic risk flags (🚨) for burnout and sensory crises.
   - Maintains clinical session notes.

## Architecture Philosophy
- **Phase-Wise Modular Development**: Full standalone frontend built with mock API layer first, followed by step-by-step Express/MongoDB backend implementation.
- **Dynamic Assessment Engine**: Questionnaires stored as templates in MongoDB, allowing modular evaluation without code changes.
- **Time-Series Analytics**: Aggregation pipelines (`$group`, `$facet`) to calculate weekly/monthly averages and identify trigger correlations.