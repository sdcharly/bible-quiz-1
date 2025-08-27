import Link from "next/link";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Scripture Quote */}
          <p className="text-xs text-muted-foreground/70 italic text-center">
            &quot;Your word is a lamp to my feet and a light to my path.&quot; - Psalm 119:105
          </p>
          
          {/* Legal Links */}
          <div className="flex items-center gap-4 text-xs">
            <Link 
              href="/privacy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link 
              href="/terms" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-muted-foreground">•</span>
            <a 
              href="mailto:support@biblequiz.textr.in"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-muted-foreground text-center">
            © {currentYear} Scrolls of Wisdom · Empowering Biblical Education
          </p>
        </div>
      </div>
    </footer>
  );
}
