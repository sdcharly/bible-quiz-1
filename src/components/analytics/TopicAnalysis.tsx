"use client";

import { Brain } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


interface TopicPerformance {
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  averageScore: number;
  attempts: number;
}

interface Props {
  topics: TopicPerformance[];
}

export default function TopicAnalysis({ topics }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const sortedTopics = [...topics].sort((a, b) => b.averageScore - a.averageScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic Performance Breakdown</CardTitle>
        <CardDescription>
          Understanding strengths and weaknesses by topic
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No topic data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTopics.map((topic) => (
              <div key={topic.topic} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{topic.topic}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {topic.correctAnswers}/{topic.totalQuestions} correct
                    </span>
                    <span className={`font-medium ${getScoreColor(topic.averageScore)}`}>
                      {topic.averageScore.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      topic.averageScore >= 80 ? "bg-green-600" :
                      topic.averageScore >= 60 ? "bg-yellow-600" : "bg-red-600"
                    }`}
                    style={{ width: `${topic.averageScore}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {topic.attempts} attempts across all students
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}