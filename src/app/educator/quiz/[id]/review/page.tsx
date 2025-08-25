"use client";

import { useParams } from "next/navigation";
import ReviewPageSingleQuestion from "./ReviewPageSingleQuestion";

export default function QuizReviewPage() {
  const params = useParams();
  const quizId = params.id as string;

  return <ReviewPageSingleQuestion quizId={quizId} />;
}