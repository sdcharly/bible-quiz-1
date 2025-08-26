"use client";

import { useState, type FC } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, Trash2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { securityLevels } from '../theme/colors';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  securityLevel?: 'low' | 'medium' | 'high' | 'critical';
  requireTypedConfirmation?: string;
  showConsequences?: string[];
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  securityLevel = 'medium',
  requireTypedConfirmation,
  showConsequences
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onOpenChange(false);
      setTypedConfirmation('');
    } catch (error) {
      // Error handling should be done in the parent component
    } finally {
      setIsProcessing(false);
    }
  };

  const canConfirm = !requireTypedConfirmation || 
    typedConfirmation === requireTypedConfirmation;

  const icons = {
    low: Shield,
    medium: AlertTriangle,
    high: Lock,
    critical: Trash2
  };

  const Icon = icons[securityLevel];

  const buttonColors = {
    low: 'bg-gray-600 hover:bg-gray-700',
    medium: 'bg-yellow-600 hover:bg-yellow-700',
    high: 'bg-orange-600 hover:bg-orange-700',
    critical: 'bg-red-700 hover:bg-red-800 border-2 border-red-900'
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className={cn(
            'flex items-center gap-3 pb-2',
            securityLevels[securityLevel].border
          )}>
            <div className={cn(
              'p-2 rounded-lg',
              securityLevel === 'critical' ? 'bg-red-100' : 'bg-yellow-50'
            )}>
              <Icon className={cn('h-5 w-5', securityLevels[securityLevel].icon)} />
            </div>
            <AlertDialogTitle className="text-lg">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Show consequences if provided */}
        {showConsequences && showConsequences.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 my-4">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
              This action will:
            </p>
            <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
              {showConsequences.map((consequence, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{consequence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Typed confirmation for critical actions */}
        {requireTypedConfirmation && (
          <div className="my-4">
            <Label htmlFor="confirmation" className="text-sm font-medium">
              Type <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {requireTypedConfirmation}
              </span> to confirm
            </Label>
            <Input
              id="confirmation"
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              className="mt-2"
              placeholder="Type confirmation text"
              autoComplete="off"
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel 
            className="border-gray-300 hover:bg-gray-50"
            disabled={isProcessing}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canConfirm || isProcessing}
            className={cn(
              buttonColors[securityLevel],
              'text-white',
              (!canConfirm || isProcessing) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isProcessing ? 'Processing...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};