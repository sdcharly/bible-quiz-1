import { Suspense } from "react";
import QuizzesContent from "./QuizzesContent";

export default function StudentQuizzesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    }>
      <QuizzesContent />
    </Suspense>
  );
}