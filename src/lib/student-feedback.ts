export type FeedbackChoice = { value: string; label: string };

export const homeworkChoices = [
  { value: "GIVEN", label: "Homework given" },
  { value: "NOT_GIVEN", label: "No homework today" },
  { value: "NOT_DONE", label: "Previous homework not completed" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
] as const satisfies readonly FeedbackChoice[];

export const feedingChoices = [
  { value: "ATE_ALL", label: "Ate all" },
  { value: "ATE_SOME", label: "Ate some" },
  { value: "DID_NOT_EAT", label: "Did not eat" },
  { value: "VOMITED", label: "Vomited" },
  { value: "DISLIKED_FOOD", label: "Did not like the food" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
] as const satisfies readonly FeedbackChoice[];

export const toiletChoices = [
  { value: "URINATED", label: "Urinated" },
  { value: "DEFECATED", label: "Defecated" },
  { value: "BOTH", label: "Urinated and defecated" },
  { value: "NONE", label: "No toilet use observed" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
] as const satisfies readonly FeedbackChoice[];

export const peerChoices = [
  { value: "FRIENDLY", label: "Friendly with classmates" },
  { value: "SHARED", label: "Shared with classmates" },
  { value: "COOPERATIVE", label: "Cooperative in group work" },
  { value: "NEEDS_SUPPORT", label: "Needed support with classmates" },
  { value: "NOT_OBSERVED", label: "Not observed" },
] as const satisfies readonly FeedbackChoice[];

export const conductChoices = [
  { value: "HAPPY", label: "Happy and settled" },
  { value: "CALM", label: "Calm" },
  { value: "SAD", label: "Sad" },
  { value: "CRIED", label: "Cried" },
  { value: "INCOMPLETE_CLASSWORK", label: "Did not finish classwork" },
  { value: "NEEDS_GUIDANCE", label: "Needed behavioural guidance" },
] as const satisfies readonly FeedbackChoice[];

export const breakChoices = [
  { value: "OBSERVED", label: "Observed break normally" },
  { value: "DID_NOT_OBSERVE", label: "Did not observe break" },
  { value: "CONCERN", label: "Break-time concern noted" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
] as const satisfies readonly FeedbackChoice[];

export const participationChoices = [
  { value: "PARTICIPATED", label: "Participated actively" },
  { value: "PARTLY_ACTIVE", label: "Participated with prompting" },
  { value: "NOT_ACTIVE", label: "Not active" },
  { value: "NEEDS_ENCOURAGEMENT", label: "Needs encouragement" },
] as const satisfies readonly FeedbackChoice[];

export const healthChoices = [
  { value: "HEALTHY", label: "Healthy" },
  { value: "MOODY", label: "Moody or unusually quiet" },
  { value: "SICK", label: "Appeared unwell" },
  { value: "MINOR_INJURY", label: "Minor injury or discomfort" },
  { value: "OTHER_CONCERN", label: "Other health concern" },
] as const satisfies readonly FeedbackChoice[];

export const arrivalChoices = [
  { value: "EARLY", label: "Arrived early" },
  { value: "ON_TIME", label: "Arrived on time" },
  { value: "LATE", label: "Arrived late" },
  { value: "ABSENT", label: "Absent" },
] as const satisfies readonly FeedbackChoice[];

export const feedbackChoiceGroups = {
  homeworkStatus: homeworkChoices,
  feedingStatus: feedingChoices,
  toiletStatus: toiletChoices,
  peerRelationshipStatus: peerChoices,
  conductStatus: conductChoices,
  breakTimeStatus: breakChoices,
  classParticipationStatus: participationChoices,
  healthStatus: healthChoices,
  arrivalStatus: arrivalChoices,
} as const;

export type FeedbackChoiceField = keyof typeof feedbackChoiceGroups;

export function isFeedbackChoice(field: FeedbackChoiceField, value: string) {
  return feedbackChoiceGroups[field].some((choice) => choice.value === value);
}

export function feedbackLabel(field: FeedbackChoiceField, value: string | null | undefined) {
  if (!value) return "Not recorded";
  return feedbackChoiceGroups[field].find((choice) => choice.value === value)?.label ?? value;
}
