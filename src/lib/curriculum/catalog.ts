// Approved curriculum catalog. No database writes or automatic enrollment.
export const elementaryGroups = [
  ["Mathematics", ["Mathematics"]],
  ["English Language", ["English Language"]],
  ["Religious and National Values (RNV)", ["Christian Religious Studies", "Social Studies", "Civic Education"]],
  ["Pre-Vocational Studies", ["Home Economics", "Agriculture", "Vocational Studies"]],
  ["Basic Science and Technology (BST)", ["Basic Science", "Physical and Health Education", "Computer Studies"]],
  ["Our World", ["Geography", "General Knowledge", "History"]],
  ["Languages", ["Igbo Language", "French"]],
  ["Cultural and Creative Arts", ["Fine Arts", "Music"]],
] as const;

export const nurserySubjects = ["Phonology", "Numeracy", "Lexis and Structure", "Reading and Writing", "Language (Igbo)", "Basic Science and Technology", "Religious and National Values (RNV)", "Our World", "Pre-Vocational Studies", "Grooming", "Creativity"] as const;

export const juniorSubjects = ["Business Studies", "Cultural & Creative Arts", "Christian Religious Studies", "Coding", "Digital Technologies", "Elocution & Phonology", "English Language", "Igbo Language", "French", "Intermediate Science", "Mathematics", "History", "Physical and Health Education", "STEM", "Robotics & AI", "Entrepreneurship Studies", "Social & Citizenship Studies"] as const;

export const seniorPathways = {
  SCIENCE: ["Biology", "Chemistry", "Further Maths", "Physics"],
  ARTS: ["Literature", "Government", "History", "Christian Religious Studies"],
  COMMERCIAL: ["Commerce", "Marketing", "Economics", "Accounting"],
} as const;

export const seniorOtherSubjects = ["Social & Citizenship Studies", "Coding", "Digital Technologies", "English Language", "Mathematics", "Igbo Language", "Robotics", "Music", "STEM", "Entrepreneurship", "Elocution & Phonology"] as const;

export type AcademicPathway = keyof typeof seniorPathways;

export function seniorAvailableSubjects(pathway: AcademicPathway): readonly string[] {
  return [...seniorOtherSubjects, ...seniorPathways[pathway]];
}

// Availability is not enrollment: optional/required policy is configured separately.
export const assessmentMaximums = { cat1: 20, cat2: 20, exam: 60 } as const;
