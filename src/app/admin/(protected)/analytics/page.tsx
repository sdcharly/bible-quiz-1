import { AnalyticsClient } from "./AnalyticsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics Dashboard - Admin",
  description: "Detailed analytics and insights for your application",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}