import { Suspense } from "react";
import { Loading } from "@/components/ui/loading";
import PerformanceClientV3 from "./PerformanceClientV3";


// This is now a server component that benefits from the layout authentication
export default async function PerformancePage() {
  // Authentication is handled by the admin layout
  // No need to check here as the layout will redirect if not authenticated
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    }>
      <PerformanceClientV3 />
    </Suspense>
  );
}