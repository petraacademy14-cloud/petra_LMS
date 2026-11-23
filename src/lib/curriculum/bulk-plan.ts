import { elementaryGroups, juniorSubjects, nurserySubjects, seniorOtherSubjects, seniorPathways } from "./catalog";
import { subjectKey } from "./registration";

export const curriculumSections = ["NURSERY","ELEMENTARY","JUNIOR","SENIOR"] as const;
export type CurriculumSection = (typeof curriculumSections)[number];
export type BulkOffering = { name: string; groupName: string | null; pathway: "SCIENCE"|"ARTS"|"COMMERCIAL"|null; sortOrder: number };

export function sectionForClass(code: string): CurriculumSection | null {
  const normalized=code.trim().toUpperCase();
  if (/^NUR[- ]?[1-9][0-9]*$/.test(normalized)) return "NURSERY";
  if (/^(?:PRI|GRADE)[- ]?[1-6]$/.test(normalized)) return "ELEMENTARY";
  if (/^JSS?[- ]?[1-3]$/.test(normalized)) return "JUNIOR";
  if (/^SSS?[- ]?[1-3]$/.test(normalized)) return "SENIOR";
  return null;
}
export function planSectionSubjects(section: CurriculumSection): BulkOffering[] {
  const items: Omit<BulkOffering,"sortOrder">[] =
    section==="NURSERY" ? nurserySubjects.map(name=>({name,groupName:null,pathway:null})) :
    section==="ELEMENTARY" ? elementaryGroups.flatMap(([group,names])=>names.map(name=>({name,groupName:group,pathway:null}))) :
    section==="JUNIOR" ? juniorSubjects.map(name=>({name,groupName:null,pathway:null})) :
    [
      ...seniorOtherSubjects.map(name=>({name,groupName:null,pathway:null})),
      ...Object.entries(seniorPathways).flatMap(([pathway,names])=>names.map(name=>({name,groupName:null,pathway:pathway as BulkOffering["pathway"]}))),
    ];
  const unique=new Set<string>();
  for(const item of items) {
    const key=subjectKey(item.name);
    if(unique.has(key)) throw new Error("DUPLICATE_CURRICULUM_SUBJECT");
    unique.add(key);
  }
  return items.map((item,index)=>({...item,sortOrder:index+1}));
}
