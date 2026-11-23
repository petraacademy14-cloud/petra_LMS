export function determineResultRoster(input:{
  legacyStudentIds:readonly string[];
  selectedStudentIds:readonly string[];
  existingStudentIds:readonly string[];
  offeringConfigured:boolean;
}) {
  const legacy=[...new Set(input.legacyStudentIds)];
  if(!input.offeringConfigured) return {studentIds:legacy,mode:"legacy" as const};
  const selected=new Set(input.selectedStudentIds);
  const current=legacy.filter(id=>selected.has(id));
  // Never conceal scores or comments from a previously populated sheet.
  if(input.existingStudentIds.some(id=>!selected.has(id))) {
    return {studentIds:legacy,mode:"legacy" as const};
  }
  return {studentIds:current,mode:"selected" as const};
}
