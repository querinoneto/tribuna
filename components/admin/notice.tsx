export function AdminNotice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-ink bg-paper-2",
    error: "border-accent bg-accent/10",
    success: "border-[#2f7a45] bg-[#2f7a45]/10",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mb-6 border-l-4 p-4 text-sm leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}
