import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";


export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 dark:bg-amber-900/20 p-4 rounded-full">
              <Shield className="h-12 w-12 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-heading font-bold mb-4">System Maintenance</h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We&apos;re currently performing scheduled maintenance to improve your experience. 
            The system will be back online shortly.
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              If you&apos;re an administrator, you can still access the{" "}
              <a href="/admin/login" className="underline font-medium">
                admin panel
              </a>
              .
            </p>
          </div>
          
          <div className="mt-8 text-xs text-gray-500">
            For urgent inquiries, please contact support.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}