"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentProgressPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to quizzes page where students can see their progress
    // The quizzes page shows scores for completed quizzes
    router.push("/student/quizzes");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}