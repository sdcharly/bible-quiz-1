export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin layout wrapper - authentication is handled at page level
  return <>{children}</>;
}