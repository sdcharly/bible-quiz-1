"use client";

import { useParams } from "next/navigation";
import { ErrorBoundary } from "@/components/educator-v2";
import ReviewPageSingleQuestion from "./ReviewPageSingleQuestion";


export default function QuizReviewPage() {
  const params = useParams();
  const quizId = params.id as string;

  return (
    <ErrorBoundary>
      <ReviewPageSingleQuestion quizId={quizId} />
    </ErrorBoundary>
  );
}