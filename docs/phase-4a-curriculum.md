# Phase 4A — Petra Academy curriculum configuration

Status: approved subject lists and scoring rules; implementation pending. Source: school-provided curriculum lists, November 2026.

## Nursery (11)
Phonology; Numeracy; Lexis and Structure; Reading and Writing; Language (Igbo); Basic Science and Technology; Religious and National Values (RNV); Our World; Pre-Vocational Studies; Grooming; Creativity.

## Elementary (18 separately scored subjects)
| Report heading | Subjects |
|---|---|
| Mathematics | Mathematics |
| English Language | English Language |
| Religious and National Values (RNV) | Christian Religious Studies (CRS); Social Studies; Civic Education |
| Pre-Vocational Studies | Home Economics; Agriculture; Vocational Studies |
| Basic Science and Technology (BST) | Basic Science; Physical and Health Education (PHE); Computer Studies |
| Our World | Geography; General Knowledge; History |
| Languages | Igbo; French |
| Cultural and Creative Arts | Fine Arts; Music |

Headings are not independently assessed. Each component has its own score.

## Junior Secondary (17)
Business Studies; Cultural & Creative Arts; Christian Religious Studies; Coding; Digital Technologies; Elocution & Phonology; English Language; Igbo Language; French; Intermediate Science; Mathematics; History; Physical and Health Education; STEM; Robotics & AI; Entrepreneurship Studies; Social & Citizenship Studies.

## Senior Secondary (23 available subjects)
| Science | Arts | Commercial |
|---|---|---|
| Biology | Literature | Commerce |
| Chemistry | Government | Marketing |
| Further Maths | History | Economics |
| Physics | Christian Religious Studies | Accounting |

Other available subjects (11): Social & Citizenship Studies; Coding; Digital Technologies; English Language; Mathematics; Igbo Language; Robotics; Music; STEM; Entrepreneurship; Elocution & Phonology.

Students select subjects according to Science, Arts or Commercial pathway. Compulsory/optional flags and exact class/campus applicability remain configurable by authorized administrators; do not automatically enroll all students in all 11 other subjects. Do not assume exactly one choice per row is required.

## Assessment
CAT 1: 20; CAT 2: 20; Examination: 60; total: 100 per assessed subject. Nursery scoring format and any exceptions must be checked against approved report templates before changing existing behavior.

## Engineering plan
- Reuse existing Subject, CampusSubject, TeachingAssignment, ResultSheet and AssessmentComponent records. Preserve existing IDs and result history. Resolve aliases by explicit review, not fuzzy matching.
- Add class curriculum mappings, section-specific display names/group/order, session-scoped pathway and student subject enrollment. Campus scope must be explicit for campus-owned records. Use additive Prisma migrations, audited mutations and server-side authorization.
- Do not infer class applicability from seed defaults: existing seed lists Primary 1–5 and SSS 1–2, not Primary 6 or SSS 3. Inspect actual class setup and confirm before adding missing class levels. Creche applicability is unconfirmed.
- Teacher rosters and result validation must use actual subject enrollments for configured classes, not all class members. Preserve legacy results and published reports; plan explicit rollout/backfill before enforcement.
- Report cards show actual enrolled subjects and separate Elementary component rows, without double-counting headings. Preserve approved layouts and publication restrictions.
- Test cross-campus access, assignment scope, optional subjects, pathway changes across sessions, score boundaries, incomplete sheets, duplicate enrollment, and historical reports. Run npm run check and preview database verification before merge.
- No production seed, migration, or deployment until reviewed and preview-tested. Existing Vercel build runs migrations automatically; keep preview database isolated.
