import { ErrorBoundary } from "@/components/error-boundary";

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}