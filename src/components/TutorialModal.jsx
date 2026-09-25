import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Zap,
  GitFork,
  Move,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';

const TOUR_STEPS = [
  {
    targetId: 'tour-trainer',
    title: '1. Hardware Trainer Module',
    badge: 'MicroLogix 1000 Hardware',
    content: 'Interact with simulated physical inputs and pilot outputs! Click Switch 1 & 2 (I:0/0, I:0/1) to toggle ON/OFF, or click and hold the momentary pushbuttons (I:0/2 Green, I:0/3 Red). Watch Pilot Lamps O:0/0 - O:0/3 illuminate in real time.',
    position: 'right'
  },
  {
    targetId: 'tour-palette',
    title: '2. Categorized Drag & Drop Palette',
    badge: 'Instructions & Memory Addresses',
    content: 'No drop-down menus required! Pick a category tab to view Bit Instructions (XIC, XIO, OTE, OTL, OTU), Timers (TON, RES), Binary relays (B3), or Hardware I/O. Drag any token directly into a rung drop zone or onto a contact or coil.',
    position: 'bottom'
  },
  {
    targetId: 'tour-branch-tool',
    title: '3. Parallel Branch Wire Tool',
    badge: 'Parallel OR & Seal-In Logic',
    content: 'Click or drag the Branch Wire (──╵─+─╷──) to split logic into parallel paths (used for 3-wire motor seal-in circuits). You can also click "+Branch" on any contact card to branch around it with 1 click!',
    position: 'bottom'
  },
  {
    targetId: 'tour-rungs',
    title: '4. Ladder Logic Canvas',
    badge: 'Power Flow Simulation',
    content: 'Build and test your ladder rungs here. Power flows from the L1 rail (left) to the L2 rail (right). When conditions evaluate to TRUE, the rung conductors and output coils illuminate in bright neon green.',
    position: 'top'
  },
  {
    targetId: 'tour-controls',
    title: '5. PLC Controls & Presets',
    badge: 'Run Mode & Reset',
    content: 'Click RUN/STOP to pause or resume PLC execution, click Reset to clear timers and pilot lamps, or select pre-built industrial lecture programs from the "Load Example Program" dropdown to study working logic.',
    position: 'bottom'
  }
];

export function TutorialModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setTargetRect(null);
      return;
    }

    const updateTarget = () => {
      const stepData = TOUR_STEPS[currentStep];
      if (!stepData) return;
      const el = document.getElementById(stepData.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right
        });
      } else {
        setTargetRect(null);
      }
    };

    const timer = setTimeout(updateTarget, 100);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const stepData = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep(s => s - 1);
    }
  };

  const getCardStyle = () => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const margin = 16;
    const cardWidth = Math.min(390, window.innerWidth - 32);
    const cardHeight = 240;

    let top = 0;
    let left = 0;

    if (stepData.position === 'right' && targetRect.right + cardWidth + margin < window.innerWidth) {
      left = targetRect.right + margin;
      top = Math.max(margin, Math.min(targetRect.top, window.innerHeight - cardHeight - margin));
    } else if (stepData.position === 'bottom' && targetRect.bottom + cardHeight + margin < window.innerHeight) {
      top = targetRect.bottom + margin;
      left = Math.max(margin, Math.min(targetRect.left + (targetRect.width - cardWidth) / 2, window.innerWidth - cardWidth - margin));
    } else if (stepData.position === 'top' && targetRect.top - cardHeight - margin > 0) {
      top = targetRect.top - cardHeight - margin;
      left = Math.max(margin, Math.min(targetRect.left + (targetRect.width - cardWidth) / 2, window.innerWidth - cardWidth - margin));
    } else {
      // Fallback
      if (targetRect.bottom + cardHeight + margin < window.innerHeight) {
        top = targetRect.bottom + margin;
      } else {
        top = Math.max(margin, targetRect.top - cardHeight - margin);
      }
      left = Math.max(margin, Math.min(targetRect.left, window.innerWidth - cardWidth - margin));
    }

    return {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${cardWidth}px`
    };
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* 1. Transparent Backdrop Click Catcher (dismiss on click outside) */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-pointer"
        title="Click outside to skip tutorial"
      />

      {/* 2. Spotlight Cut-Out Window */}
      {targetRect ? (
        <div
          style={{
            position: 'fixed',
            top: `${Math.round(Math.max(0, targetRect.top - 6))}px`,
            left: `${Math.round(Math.max(0, targetRect.left - 6))}px`,
            width: `${Math.round(targetRect.width + 12)}px`,
            height: `${Math.round(targetRect.height + 12)}px`,
            borderRadius: '16px',
            border: '2px solid #22d3ee',
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.75), 0 0 25px rgba(6, 182, 212, 0.85)',
            pointerEvents: 'none',
            zIndex: 45,
            transition: 'all 0.25s ease-out'
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-950/75 z-40 pointer-events-none" />
      )}

      {/* 3. Floating Explanatory Card */}
      <div
        style={getCardStyle()}
        className="fixed z-50 bg-slate-900 border-2 border-cyan-400 rounded-2xl shadow-2xl p-4 text-slate-100 flex flex-col gap-3 transition-all duration-300 animate-in fade-in zoom-in-95"
      >
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
              STEP {currentStep + 1} OF {TOUR_STEPS.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {stepData.badge}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            title="Close Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Title & Content */}
        <div className="space-y-1.5">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{stepData.title}</span>
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {stepData.content}
          </p>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-6 bg-cyan-400'
                  : 'w-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 font-semibold px-2 py-1 rounded transition"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md transition active:scale-95"
            >
              <span>{isLast ? 'Get Started' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default TutorialModal;
