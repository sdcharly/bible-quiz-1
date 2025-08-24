export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The (auth) route group handles its own authentication
  // Individual admin pages will check authentication as needed
  return <>{children}</>;
}