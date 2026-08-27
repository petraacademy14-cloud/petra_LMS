import { TeacherWorkspaceNav } from "@/components/teacher-workspace-nav";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <TeacherWorkspaceNav />
      {children}
    </div>
  );
}
