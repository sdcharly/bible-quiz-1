"use client";

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Languages, 
  Loader2, 
  AlertCircle,
  CheckCircle,
  Globe
} from "lucide-react";
import { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/lib/translation-service";

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranslate: (language: SupportedLanguage) => Promise<void>;
  isTranslating: boolean;
  currentLanguage?: string | null;
  questionPreview?: string;
}

export function TranslationModal({
  isOpen,
  onClose,
  onTranslate,
  isTranslating,
  currentLanguage,
  questionPreview
}: TranslationModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage | "">("");
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!selectedLanguage) {
      setError("Please select a language");
      return;
    }

    setError(null);
    try {
      await onTranslate(selectedLanguage);
      // Modal will be closed by parent component on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    }
  };

  const handleClose = () => {
    if (!isTranslating) {
      setSelectedLanguage("");
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <Languages className="h-5 w-5 text-amber-600" />
            Translate Question
          </DialogTitle>
          <DialogDescription>
            Select a language to translate this question. The translation will use AI to maintain biblical accuracy and context.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Question Preview */}
          {questionPreview && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900 font-medium mb-1">Current Question:</p>
              <p className="text-sm text-amber-800 line-clamp-2">
                {questionPreview}
              </p>
            </div>
          )}

          {/* Language Selection */}
          <div className="space-y-2">
            <Label htmlFor="language" className="text-amber-900">
              Target Language
            </Label>
            <Select
              value={selectedLanguage}
              onValueChange={(value) => setSelectedLanguage(value as SupportedLanguage)}
              disabled={isTranslating}
            >
              <SelectTrigger 
                id="language"
                className="w-full border-amber-200 focus:border-amber-400"
              >
                <SelectValue placeholder="Select a language">
                  {selectedLanguage && (
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {SUPPORTED_LANGUAGES[selectedLanguage].name}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                  <SelectItem 
                    key={code} 
                    value={code}
                    disabled={currentLanguage === code}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{lang.name}</span>
                      <span className="ml-2 text-sm text-gray-500">
                        {lang.nativeName}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Translation will update the question text, all options, and explanation. 
              You can edit the translated text afterwards for fine-tuning.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Translation Progress */}
          {isTranslating && (
            <div className="flex items-center justify-center py-4">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto" />
                <p className="text-sm text-amber-800">
                  Translating to {selectedLanguage && SUPPORTED_LANGUAGES[selectedLanguage].name}...
                </p>
                <p className="text-xs text-gray-600">
                  AI is ensuring theological accuracy and clarity
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isTranslating}
            className="border-amber-200 hover:bg-amber-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTranslate}
            disabled={!selectedLanguage || isTranslating}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isTranslating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="mr-2 h-4 w-4" />
                Translate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}