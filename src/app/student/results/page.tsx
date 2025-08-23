"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentResultsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to quizzes page with completed filter
    // The quizzes page shows both available and completed quizzes
    router.push("/student/quizzes?filter=completed");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}