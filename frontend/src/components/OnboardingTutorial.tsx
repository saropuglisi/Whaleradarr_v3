import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check, HelpCircle, ArrowRight } from 'lucide-react';

interface TutorialStep {
    targetId?: string;
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const steps: TutorialStep[] = [
    {
        title: "Welcome to Whaleradarr",
        content: "Let's decode Institutional Order Flow together. This platform gives you the 'Edge' by tracking what the Smart Money is doing in real-time.",
        position: 'center'
    },
    {
        targetId: 'smart-signal-card',
        title: "Smart Signal",
        content: "This is your primary compass. It combines Direction (Long/Short) with a Confidence Score derived from 4 key metrics. Always check the 'Staleness' penalty!",
        position: 'bottom'
    },
    {
        targetId: 'cot-index-card',
        title: "COT Index",
        content: "An oscillator (0-100) showing how extreme current positioning is compared to history. >80 is Extreme Long, <20 is Extreme Short.",
        position: 'top'
    },
    {
        targetId: 'sentiment-gap-card',
        title: "Sentiment Gap (The Edge)",
        content: "The most powerful metric. It measures the divergence between Smart Money (Asset Managers) and Retail. If Whales are Buying and Retail is Selling, that's a strong BULLISH signal.",
        position: 'top'
    },
    {
        targetId: 'staleness-card',
        title: "Staleness Engine",
        content: "COT data comes out once a week. This engine calculates how 'fresh' the data is based on price movement and volatility since the report. If it's RED, be careful!",
        position: 'bottom'
    },
    {
        title: "Quick Test",
        content: "Let's see if you're ready to trade with the Whales.",
        position: 'center'
    }
];

const QuizModal: React.FC<{ onComplete: (success: boolean) => void }> = ({ onComplete }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

    const handleAnswer = (answer: string) => {
        setSelected(answer);
        if (answer === 'bullish') {
            setResult('correct');
        } else {
            setResult('wrong');
        }
    };

    return (
        <div className="bg-white dark:bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-white/10 animate-in zoom-in-95 duration-300">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Scenario #1</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                    Price is dropping (-2%), BUT the <strong>Sentiment Gap</strong> is Extreme Positive (+45%) meaning Whales are aggressively Buying.
                </p>
                <p className="text-gray-900 dark:text-white font-bold mt-4">
                    What is the likely direction?
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                    onClick={() => handleAnswer('bearish')}
                    disabled={result !== null}
                    className={`p-4 rounded-xl border-2 transition-all ${selected === 'bearish'
                        ? result === 'wrong'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200'
                        : 'border-gray-200 dark:border-white/10 hover:border-blue-500'
                        }`}
                >
                    <span className="block text-2xl mb-1">🐻</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">Bearish</span>
                    <span className="text-xs text-gray-400 block mt-1">Trust Price</span>
                </button>

                <button
                    onClick={() => handleAnswer('bullish')}
                    disabled={result !== null}
                    className={`p-4 rounded-xl border-2 transition-all ${selected === 'bullish'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-white/10 hover:border-blue-500'
                        }`}
                >
                    <span className="block text-2xl mb-1">🐳</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">Bullish</span>
                    <span className="text-xs text-gray-400 block mt-1">Trust Whales</span>
                </button>
            </div>

            {result === 'correct' && (
                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl mb-4 text-sm">
                    <strong>Correct!</strong> Price is often manipulated or reacts to noise. If Whales are buying the dip, it's likely an accumulation phase before a reversal.
                </div>
            )}

            {result === 'wrong' && (
                <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-4 rounded-xl mb-4 text-sm">
                    <strong>Incorrect.</strong> Retail sells the drop (panic), but Whales accumulate. The Sentiment Gap reveals this hidden divergence.
                </div>
            )}

            {result && (
                <button
                    onClick={() => onComplete(result === 'correct')}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                    Continue <ArrowRight size={18} />
                </button>
            )}
        </div>
    );
};

const OnboardingTutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [quizMode, setQuizMode] = useState(false);
    const [rect, setRect] = useState<DOMRect | null>(null);

    // Update target rect when step changes
    useEffect(() => {
        const updateRect = () => {
            const step = steps[currentStep];
            if (step.targetId) {
                const el = document.getElementById(step.targetId);
                if (el) {
                    const r = el.getBoundingClientRect();
                    setRect(r);
                }
            } else {
                setRect(null);
            }
        };

        const step = steps[currentStep];
        if (step.targetId) {
            const el = document.getElementById(step.targetId);
            if (el) {
                // Initial scroll to element
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Continuous update during scroll animation (1s duration)
                const interval = setInterval(updateRect, 10);
                const timeout = setTimeout(() => clearInterval(interval), 1000);

                // Listeners for manual scroll/resize to keep valid
                window.addEventListener('scroll', updateRect, { passive: true });
                window.addEventListener('resize', updateRect, { passive: true });

                return () => {
                    clearInterval(interval);
                    clearTimeout(timeout);
                    window.removeEventListener('scroll', updateRect);
                    window.removeEventListener('resize', updateRect);
                };
            }
        } else {
            setRect(null);
        }
    }, [currentStep]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setQuizMode(true);
        }
    };

    const handleQuizComplete = () => {
        // Complete
        localStorage.setItem('whaleradarr_onboarding_completed', 'true');
        onClose();
    };

    if (quizMode) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <QuizModal onComplete={handleQuizComplete} />
            </div>
        );
    }

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
            {/* Backdrop with cutout using SVG mask or just composed divs? 
                Simpler: Full dark backdrop, but use z-index to highlight element.
                Actually, highlighting strict elements requires z-index manipulation which can break stacking contexts.
                Alternative: Draw a "spotlight" div using the rect coordinates.
            */}

            {/* Dark Backdrop */}
            <div className="absolute inset-0 bg-black/50 transition-colors duration-500" style={{ pointerEvents: 'auto' }}></div>

            {/* Spotlight Hole - Visual Only */}
            {rect && (
                <div
                    className="absolute border-4 border-blue-500 rounded-xl transition-all duration-500 ease-in-out shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                    style={{
                        top: rect.top - 8,
                        left: rect.left - 8,
                        width: rect.width + 16,
                        height: rect.height + 16,
                        // The shadow trick creates the cutout effect visual
                    }}
                >
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                        <Check size={14} />
                    </div>
                </div>
            )}

            {/* Content Card */}
            <div
                className="absolute transition-all duration-500 ease-in-out pointer-events-auto"
                style={{
                    top: rect ? (step.position === 'top' ? rect.top - 200 : rect.bottom + 20) : '50%',
                    left: rect ? (rect.left + rect.width / 2) : '50%',
                    transform: rect ? 'translateX(-50%)' : 'translate(-50%, -50%)',
                    width: '320px',
                    zIndex: 60
                }}
            >
                <div className="bg-white/90 dark:bg-[#1A1A1A]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-2xl">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">
                            Step {currentStep + 1}/{steps.length}
                        </span>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={16} />
                        </button>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                        {step.content}
                    </p>

                    <div className="flex justify-between items-center">
                        <div className="flex gap-1">
                            {steps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-blue-500' : 'bg-gray-200 dark:bg-white/20'}`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={handleNext}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all hover:scale-105"
                        >
                            {currentStep === steps.length - 1 ? 'Start Quiz' : 'Next'} <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTutorial;
