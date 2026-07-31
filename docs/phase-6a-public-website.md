# Phase 6A: Public website foundation

## Scope delivered in Sprint 6A.1

- Replace the root dashboard redirect with a public Petra Academy homepage.
- Add responsive public navigation and footer.
- Add About, Programs, Admissions, Contact and Book a Visit pages.
- Reuse Phase 5 published updates through the public News navigation.
- Add Apply Now entry pages for new and returning applicants.
- Add a Student, Parent and Teacher login selector while preserving the existing secure email/password sign-in component.
- Apply Petra Academy red, white and silver branding, metadata and favicon.
- Optimize layouts for narrow Android screens and low-data operation.

## Deliberately deferred to Sprint 6A.2

The public forms are the UI foundation only in this sprint. Do not represent form submissions as stored until the following backend work is merged:

- Applicant and application database models
- Applicant account verification and authentication
- Draft application storage
- Document upload
- Visit booking storage and admin review
- Contact enquiry delivery destination
- Entrance fee and examination workflows

## Verification

Before merging:

1. Run `npm run check`.
2. Verify `/`, `/about`, `/programs`, `/admissions`, `/apply`, `/book-visit`, `/contact`, `/news` and `/login`.
3. Check the homepage and forms at 360px and desktop widths.
4. Confirm `/login/teacher` still authenticates an existing staff user and redirects to `/dashboard`.
5. Confirm public pages do not expose private student, guardian, staff or financial data.
