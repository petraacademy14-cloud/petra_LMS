import { z } from "zod";

// Existing migrations create deterministic scheme_<md5> IDs.
export const gradingSchemeId = z.union([
  z.string().cuid(),
  z.string().regex(/^scheme_[0-9a-f]{32}$/),
]);
