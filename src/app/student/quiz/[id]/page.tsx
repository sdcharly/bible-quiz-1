"use client";

import dynamic from "next/dynamic";
import { BiblicalPageLoader } from "@/components/ui/biblical-loader";

// Dynamically import the quiz page to ensure it's only rendered on the client
const ImprovedQuizTakingPage = dynamic(
  () => import("./ImprovedQuizPage"),
  {
    ssr: false,
    loading: () => <BiblicalPageLoader text="Loading quiz..." />
  }
);

export default function QuizPage() {
  return <ImprovedQuizTakingPage />;
}