import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ListTodo, Sparkles, Move, MoreHorizontal, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import { usePreferenceStore } from '../stores/preferenceStore';

export interface OnboardingTourProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const TOUR_STEPS = [
  {
    step: 1,
    title: 'Your Calendar Workspace',
    icon: Calendar,
    message: 'See your academic commitments and planned study work in one place.',
    detail: 'Navigate between Day, Week, Month, Quarter, Year, and Timeline anytime.',
    badge: 'Step 1 of 5 · Overview',
  },
  {
    step: 2,
    title: 'Add & Manage Tasks',
    icon: ListTodo,
    message: 'Add work you need to get done with estimated durations and deadlines.',
    detail: 'Try typing natural phrases like "Làm Database Project trong 2 tiếng chiều mai".',
    badge: 'Step 2 of 5 · Tasks',
  },
  {
    step: 3,
    title: 'Smart Scheduling Engine',
    icon: Sparkles,
    message: 'Let SmartSchedule automatically find conflict-free, optimal time slots.',
    detail: 'Balanced around your daily focus capacity without manual math.',
    badge: 'Step 3 of 5 · Smart Plan',
  },
  {
    step: 4,
    title: 'Interactive Drag & Drop',
    icon: Move,
    message: 'Move tasks directly onto your calendar or drag between slots with ease.',
    detail: 'Resize sessions by dragging boundaries, or double-click to edit immediately.',
    badge: 'Step 4 of 5 · Flexibility',
  },
  {
    step: 5,
    title: 'More Actions & ⌘K Shortcuts',
    icon: MoreHorizontal,
    message: 'Advanced tools and keyboard shortcuts are always here when you need them.',
    detail: 'Press ⌘K / Ctrl+K anytime to open the Command Palette, run bulk operations, or undo with Ctrl+Z.',
    badge: 'Step 5 of 5 · Power Features',
  },
];

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const { hasCompletedOnboarding, setHasCompletedOnboarding } = usePreferenceStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // If isOpen is explicitly provided, respect it; otherwise show if !hasCompletedOnboarding
  const showTour = isOpen !== undefined ? isOpen : !hasCompletedOnboarding;

  const modalRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<Element | null>(null);

  // Save active element for focus restoration
  useEffect(() => {
    if (showTour) {
      triggerElementRef.current = document.activeElement;
      setCurrentStepIndex(0);
      const timer = setTimeout(() => {
        nextButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (triggerElementRef.current instanceof HTMLElement) {
      triggerElementRef.current.focus();
    }
  }, [showTour]);

  // Keyboard navigation: Escape, ArrowRight, ArrowLeft, Enter
  useEffect(() => {
    if (!showTour) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleFinish();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTour, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    setHasCompletedOnboarding(true);
    onClose?.();
  };

  if (!showTour) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const IconComponent = currentStep.icon;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      className="onboarding-tour-backdrop"
      onClick={handleFinish}
      role="presentation"
    >
      <div
        ref={modalRef}
        className="onboarding-tour-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome tour to SmartSchedule"
        tabIndex={-1}
      >
        <div className="onboarding-tour-header">
          <div className="onboarding-header-left">
            <span className="onboarding-badge" aria-live="polite">
              {currentStep.badge}
            </span>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={handleFinish}
            title="Skip tour (Esc)"
            aria-label="Skip tour"
          >
            <X size={15} />
          </button>
        </div>

        <div className="onboarding-tour-content">
          <div className="onboarding-icon-avatar">
            <IconComponent size={28} />
          </div>

          <div className="onboarding-copy-block">
            <h3>{currentStep.title}</h3>
            <p className="onboarding-main-message">{currentStep.message}</p>
            <p className="onboarding-detail-message">{currentStep.detail}</p>
          </div>
        </div>

        {/* Step Indicator Dots */}
        <div className="onboarding-step-indicators" aria-hidden="true">
          {TOUR_STEPS.map((step, idx) => (
            <button
              key={step.step}
              type="button"
              className={`onboarding-dot ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'completed' : ''}`}
              onClick={() => setCurrentStepIndex(idx)}
              title={`Go to step ${idx + 1}`}
              aria-label={`Step ${idx + 1}`}
            />
          ))}
        </div>

        <div className="onboarding-tour-footer">
          <button
            type="button"
            className="text-button"
            onClick={handleFinish}
          >
            Skip walkthrough
          </button>

          <div className="onboarding-footer-buttons">
            {currentStepIndex > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={handlePrev}
                aria-label="Previous step"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
            )}

            <button
              ref={nextButtonRef}
              type="button"
              className="primary-button"
              onClick={handleNext}
              aria-label={isLastStep ? 'Finish walkthrough' : 'Next step'}
            >
              <span>{isLastStep ? 'Get started' : 'Next'}</span>
              {isLastStep ? <Check size={14} /> : <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
