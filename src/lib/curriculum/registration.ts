import { elementaryGroups, juniorSubjects, nurserySubjects, seniorOtherSubjects, seniorPathways } from "./catalog";

// Explicit known synonyms only; never match on a generated code alone.
const aliases: Record<string,string> = {
  "basic science & technology":"basic science and technology",
  "crs":"christian religious studies",
  "phe":"physical and health education",
  "igbo":"igbo language",
  "language (igbo)":"igbo language",
  "further mathematics":"further maths",
  "cultural and creative arts":"cultural & creative arts",
};
export function subjectKey(name:string) {
  const key=name.trim().replace(/\s+/g," ").toLowerCase();
  return aliases[key]??key;
}
export function catalogNames() {
  const names=[...nurserySubjects,...elementaryGroups.flatMap(([,subjects])=>[...subjects] as string[]),...juniorSubjects,...seniorOtherSubjects,...Object.values(seniorPathways).flat()];
  return [...new Map(names.map(name=>[subjectKey(name),name])).values()];
}
export function isSeniorClassCode(code:string) {
  return /^(?:SSS?|SENIOR)[ -]?[123]$/i.test(code.trim());
}
