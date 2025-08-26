"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineData {
  date: string;
  attempts: number;
  averageScore: number;
}

interface Props {
  data: TimelineData[];
}

export default function PerformanceTrend({ data }: Props) {
  const maxAttempts = Math.max(...data.filter(d => d && d.attempts != null).map(d => d.attempts), 1);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trend</CardTitle>
        <CardDescription>
          Average scores and attempts over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-2">
          {data.filter(item => item && item.attempts != null && item.averageScore != null && item.date).map((item, index) => {
            const heightPercentage = (item.attempts / maxAttempts) * 100;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t relative" 
                     style={{ height: `${heightPercentage}%` }}>
                  <div className={`absolute inset-x-0 bottom-0 rounded-t ${
                    item.averageScore >= 70 ? "bg-green-500" : "bg-red-500"
                  }`} 
                       style={{ height: `${item.averageScore}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                  {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center gap-8 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            <span className="text-sm text-gray-600">Total Attempts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-sm text-gray-600">Pass (≥70%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-sm text-gray-600">Fail (&lt;70%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}