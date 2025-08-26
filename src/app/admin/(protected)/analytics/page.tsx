import { Metadata } from "next";
import { AnalyticsClientV2 } from "./AnalyticsClientV2";


export const metadata: Metadata = {
  title: "Analytics Dashboard - Admin",
  description: "Detailed analytics and insights for your application",
};

export default function AnalyticsPage() {
  return <AnalyticsClientV2 />;
}