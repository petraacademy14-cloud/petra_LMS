# Phase 5: Communication and digital presence

## Scope

Phase 5 gives Petra Academy one controlled workflow for staff announcements and
public school updates. It does not add private chat, automatic WhatsApp delivery,
bulk email infrastructure or a parent account portal.

## Staff communication

- Announcements target the whole school, one campus or one class.
- Teachers may create campus/class drafts and submit them for review.
- Owners and campus admins review, approve, publish and archive within scope.
- Published parent-facing announcements appear on the public updates page.
- Fee, result, attendance and general templates support WhatsApp, email and print.
- Template variables include `{{school}}`, `{{title}}` and `{{message}}`.
- Delivery generation creates an auditable draft and recipient count; it never
  claims that an external message was sent.

## Digital presence

- News, events and student achievements use draft, review, approval, publication
  and archive states.
- Public URLs use unique, readable slugs.
- Posts support campus, category, tags, cover-image URL and event dates.
- Optional images/PDFs use a private Supabase bucket named
  `communication-media`, with a five-megabyte application limit.
- Newsletter signup stores a subscriber list only. External campaigns remain a
  later integration.

## Authorization and data rules

- All records carry `schoolId`; campus-owned records explicitly carry
  `campusId`.
- Database triggers reject cross-school campus, class, category, publication and
  media references.
- Teachers cannot approve or publish.
- Important workflow changes and generated delivery drafts are audited.
- Public routes return only content with `PUBLISHED` status.

## Acceptance checks

- A teacher cannot create a school-wide announcement or publish any content.
- A campus admin cannot read or change another campus's scoped drafts.
- Class announcements require matching campus and class.
- Draft content cannot skip review/approval.
- Parent announcements are invisible publicly before publication.
- Archived content is removed from public lists.
- WhatsApp/email actions create drafts without sending.
- Event end time cannot precede its start time.
- Media rejects unsupported types and files larger than five megabytes.
- Duplicate public slugs and subscriber emails are prevented.
- Public pages remain usable on a narrow Android viewport.
- `npm run check` passes before merge.
