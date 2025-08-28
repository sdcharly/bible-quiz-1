import { AlertCircle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  showRefresh?: boolean;
  showHome?: boolean;
  redirectUrl?: string;
  redirectLabel?: string;
  onRefresh?: () => void;
}

export function ErrorFallback({
  title = "Unable to Load Content",
  message = "The requested content could not be loaded. Please try refreshing the page.",
  showRefresh = true,
  showHome = true,
  redirectUrl,
  redirectLabel,
  onRefresh
}: ErrorFallbackProps) {
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {title}
            </h2>
            <p className="text-gray-600 mb-4">
              {message}
            </p>
            <div className="space-y-2">
              {showRefresh && (
                <Button 
                  onClick={handleRefresh}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
              )}
              {redirectUrl && (
                <Link href={redirectUrl}>
                  <Button variant="outline" className="w-full">
                    {redirectLabel || "Go Back"}
                  </Button>
                </Link>
              )}
              {showHome && !redirectUrl && (
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Go to Home
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// For pages that need minimal error UI
export function MinimalErrorFallback({ message = "Content not available" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px] text-gray-500">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
        <p>{message}</p>
      </div>
    </div>
  );
}