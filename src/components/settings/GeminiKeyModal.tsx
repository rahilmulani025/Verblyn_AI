import React, { useState, useEffect } from 'react';
import { useGeminiKey } from '@/context/GeminiKeyContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Bot,
} from 'lucide-react';

interface GeminiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GeminiKeyModal: React.FC<GeminiKeyModalProps> = ({ open, onOpenChange }) => {
  const {
    hasGeminiKey,
    connectionStatus,
    connectionError,
    clearGeminiApiKey,
    testGeminiConnection,
  } = useGeminiKey();

  const [inputKey, setInputKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);

  // Reset input field whenever modal opens/closes to keep raw key out of persistent component state
  useEffect(() => {
    if (!open) {
      setInputKey('');
      setShowPassword(false);
      setTestResultMsg(null);
    }
  }, [open]);

  const handleSaveAndTest = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed) return;
    setTesting(true);
    setTestResultMsg(null);

    const res = await testGeminiConnection(trimmed);
    setTesting(false);

    if (res.success) {
      setTestResultMsg(`Connected successfully (${res.latencyMs}ms latency)`);
      setTimeout(() => {
        onOpenChange(false);
      }, 1200);
    } else {
      setTestResultMsg(res.message);
    }
  };

  const handleRemove = () => {
    clearGeminiApiKey();
    setInputKey('');
    setTestResultMsg(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <span>{hasGeminiKey ? 'Change Gemini API Key' : 'Connect Gemini AI (BYOK)'}</span>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Provide your personal Google Gemini API key to activate personalized topic generation, audio analysis, and AI speech evaluation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Key Input Field */}
          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>{hasGeminiKey ? 'New Gemini API Key' : 'Gemini API Key'}</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                Get free key <ExternalLink className="w-3 h-3" />
              </a>
            </Label>

            <div className="relative">
              <Input
                id="gemini-key"
                type={showPassword ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="pr-10 text-xs font-mono bg-secondary/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide key' : 'Show key'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Connection Status Feedback */}
          {testResultMsg && connectionStatus === 'connected' && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{testResultMsg}</span>
            </div>
          )}

          {(testResultMsg && connectionStatus === 'error') || (!testResultMsg && connectionError) ? (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{testResultMsg || connectionError || 'Could not connect. Please check your key.'}</span>
            </div>
          ) : null}

          {/* Security Assurance Card */}
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Zero-Cloud Key Privacy Guarantee</span>
            </div>
            <p className="leading-relaxed">
              Your API key is encrypted directly on your device using Web Crypto AES-GCM and kept solely in runtime memory. Verblyn never stores your key in any database, cloud profile, or analytics logs.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 pt-2 border-t border-border/40">
          {hasGeminiKey ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="text-xs text-rose-400 hover:text-rose-300 gap-1 border-rose-500/30 hover:bg-rose-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remove Key
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveAndTest}
              disabled={testing || !inputKey.trim()}
              className="text-xs font-semibold gap-1.5"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Validating...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" /> Save & Test Key
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
