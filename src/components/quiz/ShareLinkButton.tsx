"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Share2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Loader2,
  Link2
} from "lucide-react";

interface ShareLinkButtonProps {
  quizId: string;
  quizTitle: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

export function ShareLinkButton({
  quizId,
  quizTitle,
  variant = "outline",
  size = "default",
  showLabel = true
}: ShareLinkButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    if (open && !shareUrl) {
      fetchShareLink();
    }
  }, [open]);

  const fetchShareLink = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/share-link`);
      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
        setShortUrl(data.shortUrl);
        setClickCount(data.clickCount || 0);
      } else {
        toast({
          title: "Error",
          description: "Failed to get share link",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching share link:", error);
      toast({
        title: "Error",
        description: "Failed to get share link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateLink = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/educator/quiz/${quizId}/share-link`, {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
        setShortUrl(data.shortUrl);
        setClickCount(0);
        toast({
          title: "Success",
          description: "New share link generated",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to regenerate link",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error regenerating link:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate link",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  const shareViaWhatsApp = (url: string) => {
    const message = `Join my quiz "${quizTitle}" on Scrolls of Wisdom: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = (url: string) => {
    const subject = `Invitation: ${quizTitle}`;
    const body = `You're invited to take the quiz "${quizTitle}" on Scrolls of Wisdom.\n\nClick here to start: ${url}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={variant} size={size}>
          <Share2 className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
          {showLabel && "Share Link"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Share Quiz Link</h4>
            <p className="text-sm text-muted-foreground">
              Share this link with students via WhatsApp or other chat apps
            </p>
          </div>

          {loading && !shareUrl ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Share URL Display */}
              <div className="space-y-2">
                <Label>Share URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={shortUrl || shareUrl || ""}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(shortUrl || shareUrl || "")}
                    disabled={!shareUrl}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {clickCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    This link has been clicked {clickCount} time{clickCount === 1 ? '' : 's'}
                  </p>
                )}
              </div>

              {/* Quick Share Buttons */}
              <div className="space-y-2">
                <Label>Quick Share</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => shareViaWhatsApp(shortUrl || shareUrl || "")}
                    disabled={!shareUrl}
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 16.772c-.258.676-.756 1.224-1.387 1.523-.41.194-.851.291-1.298.291-.299 0-.602-.041-.902-.125-1.231-.341-2.368-.975-3.482-1.555-2.306-1.199-4.266-3.16-5.465-5.465-.58-1.114-1.214-2.251-1.555-3.482-.207-.749-.128-1.531.221-2.201.299-.576.844-1.04 1.496-1.276.247-.089.503-.134.759-.134.093 0 .186.006.278.018.255.033.51.086.725.362.267.344.534.688.814 1.019.139.164.282.326.426.487.432.486.432.946 0 1.432-.144.162-.287.323-.431.485-.143.161-.286.323-.429.484-.106.119-.216.238-.216.475 0 .119.027.237.08.344.579 1.156 1.324 2.217 2.226 3.12.903.902 1.964 1.647 3.12 2.226.107.053.225.08.344.08.237 0 .356-.11.475-.216.161-.143.323-.286.484-.429.162-.144.323-.287.485-.431.486-.432.946-.432 1.432 0 .161.144.323.287.487.426.331.28.675.547 1.019.814.276.215.329.47.362.725.052.399-.067.807-.334 1.141z"/>
                    </svg>
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => shareViaEmail(shortUrl || shareUrl || "")}
                    disabled={!shareUrl}
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </Button>
                </div>
              </div>

              {/* Additional Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(shortUrl || shareUrl || "", '_blank')}
                  disabled={!shareUrl}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateLink}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}