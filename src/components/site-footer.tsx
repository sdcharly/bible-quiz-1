import { GitHubStars } from "./ui/github-stars";

export function SiteFooter() {
  return (
    <footer className="border-t py-6 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-3">
          <GitHubStars repo="sdcharly/bible-quiz-1" />
          <p>
            Bible Quiz Platform - AI-Powered Biblical Knowledge Assessment
          </p>
        </div>
      </div>
    </footer>
  );
}
