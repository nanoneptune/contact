import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface GlassmorphismOtpModalProps {
  email: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (email: string) => void;
}

export default function GlassmorphismOtpModal({
  email,
  isOpen,
  onClose,
  onVerified,
}: GlassmorphismOtpModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successVerified, setSuccessVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Automatically trigger OTP sending when modal opens
  useEffect(() => {
    if (isOpen && email && !otpSent && !sending) {
      handleSendOtp();
    }
  }, [isOpen, email]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    setSending(true);
    setErrorMsg('');
    setSuccessVerified(false);

    try {
      const res = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOtpSent(true);
        setResendCooldown(60); // 60 seconds cooldown
        setDigits(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 150);
      } else {
        setErrorMsg(data.error || 'Failed to send OTP email.');
      }
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setErrorMsg(err?.message || 'Network error while sending OTP.');
    } finally {
      setSending(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numbers
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;

    const newDigits = [...digits];

    if (cleanValue.length > 1) {
      // User pasted multiple numbers
      const pasted = cleanValue.slice(0, 6).split('');
      pasted.forEach((char, idx) => {
        if (index + idx < 6) {
          newDigits[index + idx] = char;
        }
      });
      setDigits(newDigits);
      const nextIndex = Math.min(index + pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      newDigits[index] = cleanValue;
      setDigits(newDigits);

      if (cleanValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = digits.join('');

    if (fullCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the OTP code.');
      return;
    }

    setVerifying(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: fullCode }),
      });

      const data = await res.json();

      if (res.ok && data.verified) {
        setSuccessVerified(true);
        setTimeout(() => {
          onVerified(email.trim());
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Invalid OTP verification code.');
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setErrorMsg(err?.message || 'Server error while verifying OTP.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Background Decorative Ambient Glass Auras */}
      <div className="absolute w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl -top-10 -left-10 pointer-events-none" />
      <div className="absolute w-72 h-72 bg-purple-500/20 rounded-full blur-3xl -bottom-10 -right-10 pointer-events-none" />

      {/* Main Glassmorphism Modal Box */}
      <div className="relative w-full max-w-md bg-slate-900/80 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-white overflow-hidden space-y-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Verified Screen */}
        {successVerified ? (
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Email Verified!
            </h3>
            <p className="text-xs text-slate-300">
              <span className="text-emerald-400 font-medium">{email}</span> has been securely authenticated.
            </p>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-400 mb-1 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <span>Interactive OTP Verification</span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </h3>
              <p className="text-xs text-slate-300">
                A 6-digit Glassmorphism verification code has been sent via SMTP to:
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/15 rounded-full text-xs font-mono text-purple-300">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>{email}</span>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 6 Digit Input Fields */}
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={sending || verifying}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/40 focus:bg-white/15 transition-all shadow-inner"
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={verifying || digits.join('').length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Passcode...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Email Address</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Lock className="w-3 h-3 text-indigo-400" />
                    Glassmorphism Security
                  </span>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sending || resendCooldown > 0}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium disabled:text-slate-500 transition-colors flex items-center gap-1"
                  >
                    {sending ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span>
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend OTP Code'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
