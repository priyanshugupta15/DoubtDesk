"use client"

import { useState, useRef } from 'react';
import {
    Send, Zap, BookOpen, Lightbulb, Loader2, RefreshCcw,
    ImagePlus, X, Type, Camera, ListOrdered, Brain, CheckCircle2, AlertCircle
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

type InputMode = 'text' | 'image';
type SolveType = 'standard' | 'simple' | 'exam';

const SECTION_META: Record<string, { icon: React.ReactNode; color: string; badge: string }> = {
    'Step-by-step explanation': {
        icon: <ListOrdered className="w-5 h-5" />,
        color: 'from-blue-500 to-cyan-400',
        badge: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
    },
    'Simplified explanation': {
        icon: <Brain className="w-5 h-5" />,
        color: 'from-purple-500 to-pink-400',
        badge: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
    },
    'Final Answer': {
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: 'from-emerald-500 to-teal-400',
        badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
    },
};

/** Parse the AI response string into named sections */
function parseSections(text: string): { title: string; content: string }[] {
    const parts = text.split(/^## /m).filter(Boolean);
    return parts.map(part => {
        const newline = part.indexOf('\n');
        const title = newline === -1 ? part.trim() : part.slice(0, newline).trim();
        const content = newline === -1 ? '' : part.slice(newline + 1).trim();
        return { title, content };
    });
}

const EXAMPLE_PROMPTS = [
    "Solve x² - 5x + 6 = 0 using the quadratic formula",
    "Explain Newton's Second Law of Motion",
    "Find the mean and standard deviation of: 5, 10, 15, 20, 25",
    "What is Ohm's Law? Give an example.",
];

export default function AskAIPage() {
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [prompt, setPrompt] = useState('');
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [response, setResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentType, setCurrentType] = useState<SolveType>('standard');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setImageBase64(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleAskAI = async (type: SolveType = 'standard') => {
        if (!prompt.trim() && !imageBase64) return;
        setIsLoading(true);
        setCurrentType(type);
        setErrorMsg(null);
        setResponse(null);
        try {
            const res = await fetch('/api/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, type, imageBase64 })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "The AI couldn't process your request.");
            setResponse(data.reply);
        } catch (err: any) {
            setErrorMsg(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const canSubmit = inputMode === 'text' ? prompt.trim().length > 0 : !!imageBase64;
    const sections = response ? parseSections(response) : [];

    return (
        <div className="flex h-screen bg-[#020617] text-white overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 flex flex-col overflow-y-auto">
                {/* Mobile Header */}
                <header className="flex lg:hidden items-center gap-3 px-4 py-3 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-20">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-lg">
                        <div className="w-5 h-0.5 bg-white mb-1 rounded" /><div className="w-5 h-0.5 bg-white mb-1 rounded" /><div className="w-5 h-0.5 bg-white rounded" />
                    </button>
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-white">Ask AI Solver</span>
                </header>

                <div className="max-w-[900px] mx-auto w-full px-4 sm:px-8 py-10 pb-8 space-y-8">

                    {/* ── Page Header ── */}
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-black uppercase tracking-widest">
                            <Zap className="w-3 h-3" /> Powered by Groq AI
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter">
                            AI Instant <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Doubt Solver</span>
                        </h1>
                        <p className="text-slate-400 text-base max-w-lg leading-relaxed">
                            Type your doubt or upload a photo of your question. Get structured, step-by-step explanations instantly.
                        </p>
                    </div>

                    {/* ── Input Card ── */}
                    <div className="bg-slate-900/60 border border-white/8 rounded-3xl overflow-hidden shadow-2xl">

                        {/* Mode Tabs */}
                        <div className="flex border-b border-white/5">
                            <button
                                onClick={() => { setInputMode('text'); setImageBase64(null); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${inputMode === 'text' ? 'text-cyan-400 border-b-2 border-cyan-500 bg-cyan-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Type className="w-4 h-4" /> Type Question
                            </button>
                            <button
                                onClick={() => { setInputMode('image'); setPrompt(''); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold transition-all ${inputMode === 'image' ? 'text-purple-400 border-b-2 border-purple-500 bg-purple-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Camera className="w-4 h-4" /> Upload Image
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {inputMode === 'text' ? (
                                <>
                                    <textarea
                                        id="doubt-input"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAskAI(); }}
                                        placeholder="e.g. How do I solve x² - 5x + 6 = 0?   (Ctrl+Enter to submit)"
                                        rows={4}
                                        className="w-full bg-slate-950/60 border border-white/8 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 transition-all resize-none font-medium text-[15px] leading-relaxed"
                                        disabled={isLoading}
                                    />
                                    {/* Example Pills */}
                                    <div className="flex flex-wrap gap-2">
                                        {EXAMPLE_PROMPTS.map((ex) => (
                                            <button
                                                key={ex}
                                                onClick={() => setPrompt(ex)}
                                                className="text-xs text-slate-400 hover:text-cyan-400 px-3 py-1.5 rounded-xl bg-white/4 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all"
                                            >
                                                {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                                    {!imageBase64 ? (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full h-44 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                                        >
                                            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform border border-purple-500/20">
                                                <ImagePlus className="w-6 h-6 text-purple-400" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-white font-bold">Click to upload image</p>
                                                <p className="text-slate-500 text-sm mt-1">PNG, JPG, WEBP · Max 10MB</p>
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                                            <img src={imageBase64} alt="Uploaded question" className="w-full max-h-64 object-contain" />
                                            <button
                                                onClick={() => { setImageBase64(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                className="absolute top-3 right-3 w-8 h-8 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                                            >
                                                <X className="w-4 h-4 text-white" />
                                            </button>
                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent py-3 px-4">
                                                <p className="text-white text-sm font-medium">Image ready · AI will read this question</p>
                                            </div>
                                        </div>
                                    )}
                                    {/* Optional extra context for image mode */}
                                    {imageBase64 && (
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="Optional: Add context or a specific question about this image..."
                                            rows={2}
                                            className="w-full bg-slate-950/60 border border-white/8 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all resize-none text-sm"
                                            disabled={isLoading}
                                        />
                                    )}
                                </>
                            )}

                            {/* Submit Row */}
                            <div className="flex justify-end pt-1">
                                <button
                                    onClick={() => handleAskAI('standard')}
                                    disabled={isLoading || !canSubmit}
                                    className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed group/btn"
                                >
                                    {isLoading && currentType === 'standard' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    )}
                                    Solve Doubt
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Error ── */}
                    {errorMsg && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-red-400 font-bold text-sm">Could not get a response</p>
                                <p className="text-red-400/70 text-xs mt-1">{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* ── Skeleton Loader ── */}
                    {isLoading && (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 space-y-3 animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-white/5" />
                                        <div className="h-4 w-40 rounded bg-white/5" />
                                    </div>
                                    <div className="space-y-2 pl-11">
                                        <div className="h-3 rounded bg-white/5 w-full" />
                                        <div className="h-3 rounded bg-white/5 w-5/6" />
                                        <div className="h-3 rounded bg-white/5 w-4/6" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Answer Sections ── */}
                    {!isLoading && sections.length > 0 && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-6 fade-in-0 duration-500">
                            {sections.map((sec, idx) => {
                                const meta = SECTION_META[sec.title];
                                return (
                                    <div
                                        key={idx}
                                        className="bg-slate-900/60 border border-white/8 rounded-3xl overflow-hidden shadow-lg"
                                    >
                                        {/* Section Header */}
                                        <div className={`flex items-center gap-3 px-6 py-4 border-b border-white/5 ${meta ? '' : 'bg-white/3'}`}>
                                            {meta && (
                                                <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${meta.color} bg-opacity-10 border ${meta.badge} shadow`}>
                                                    {meta.icon}
                                                </div>
                                            )}
                                            <h2 className="text-white font-black tracking-tight text-base">{sec.title || `Section ${idx + 1}`}</h2>
                                            {meta && (
                                                <span className={`ml-auto text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${meta.badge}`}>
                                                    {idx === 0 ? 'Step-by-step' : idx === 1 ? 'Simplified' : 'Answer'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Section Body */}
                                        <div className="px-6 py-6">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath, remarkGfm]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    // Step labels: full-width block row with numbered pill + accent border
                                                    strong: ({ children }) => {
                                                        const text = String(children);
                                                        const isStepLabel = /^Step\s+\d+/i.test(text);
                                                        if (isStepLabel) {
                                                            const num = text.match(/\d+/)?.[0];
                                                            const label = text.replace(/^Step\s+\d+\s*[–—-]\s*/i, '');
                                                            return (
                                                                <span className="flex items-center gap-3 mt-7 mb-3 first:mt-0">
                                                                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-black shrink-0 shadow-sm">
                                                                        {num}
                                                                    </span>
                                                                    <span className="text-[15px] font-black text-white tracking-tight leading-tight">{label}</span>
                                                                </span>
                                                            );
                                                        }
                                                        return <strong className="text-white font-bold">{children}</strong>;
                                                    },

                                                    // Paragraphs: left-aligned, proper spacing
                                                    p: ({ children }) => (
                                                        <p className="text-slate-300 leading-[1.9] font-medium my-3 text-[15px] pl-0">{children}</p>
                                                    ),

                                                    // List items
                                                    li: ({ children }) => (
                                                        <li className="text-slate-300 leading-relaxed font-medium my-1.5 text-[15px]">{children}</li>
                                                    ),

                                                    // Ordered list — indent cleanly
                                                    ol: ({ children }) => (
                                                        <ol className="list-decimal list-outside ml-6 mt-2 mb-4 space-y-2">{children}</ol>
                                                    ),

                                                    // Unordered list
                                                    ul: ({ children }) => (
                                                        <ul className="list-disc list-outside ml-6 mt-2 mb-4 space-y-2">{children}</ul>
                                                    ),

                                                    // Block math: left-aligned in a styled container
                                                    div: ({ className, children, ...props }: any) => {
                                                        if (className?.includes('math-display')) {
                                                            return (
                                                                <div className="my-4 pl-4 border-l-2 border-cyan-500/40 bg-slate-950/50 rounded-r-xl py-4 pr-4 overflow-x-auto">
                                                                    <div className={className} {...props}>{children}</div>
                                                                </div>
                                                            );
                                                        }
                                                        return <div className={className} {...props}>{children}</div>;
                                                    },

                                                    // Tables — beautifully styled
                                                    table: ({ children }) => (
                                                        <div className="my-5 overflow-x-auto rounded-2xl border border-white/8 shadow-lg">
                                                            <table className="w-full text-sm text-left">{children}</table>
                                                        </div>
                                                    ),
                                                    thead: ({ children }) => (
                                                        <thead className="bg-slate-800/80 border-b border-white/8">{children}</thead>
                                                    ),
                                                    tbody: ({ children }) => (
                                                        <tbody className="divide-y divide-white/5">{children}</tbody>
                                                    ),
                                                    tr: ({ children }) => (
                                                        <tr className="hover:bg-white/3 transition-colors">{children}</tr>
                                                    ),
                                                    th: ({ children }) => (
                                                        <th className="px-4 py-3 text-xs font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">{children}</th>
                                                    ),
                                                    td: ({ children }) => (
                                                        <td className="px-4 py-3 text-slate-300 font-medium text-[14px] [&_.katex]:text-slate-100">{children}</td>
                                                    ),

                                                    // Blockquote — highlighted note
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="my-4 pl-4 border-l-4 border-yellow-500/50 bg-yellow-500/5 rounded-r-xl py-3 pr-4 text-yellow-200/80 italic text-[14px]">
                                                            {children}
                                                        </blockquote>
                                                    ),

                                                }}
                                            >
                                                {sec.content}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                );
                            })}


                            {/* ── Extra Options ── */}
                            {currentType === 'standard' && (
                                <div className="bg-slate-900/40 border border-white/5 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div>
                                        <p className="text-white font-bold text-sm">Need a different take?</p>
                                        <p className="text-slate-500 text-xs mt-0.5">Get the same answer in another style</p>
                                    </div>
                                    <div className="flex gap-3 sm:ml-auto flex-wrap">
                                        <button
                                            onClick={() => handleAskAI('simple')}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all text-xs font-bold uppercase tracking-wider"
                                        >
                                            <Lightbulb className="w-3.5 h-3.5" /> Explain Simply
                                        </button>
                                        <button
                                            onClick={() => handleAskAI('exam')}
                                            disabled={isLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all text-xs font-bold uppercase tracking-wider"
                                        >
                                            <BookOpen className="w-3.5 h-3.5" /> Exam-Ready
                                        </button>
                                    </div>
                                </div>
                            )}

                            {currentType !== 'standard' && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => handleAskAI('standard')}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/5 transition-all text-xs font-bold uppercase tracking-wider"
                                    >
                                        <RefreshCcw className="w-3.5 h-3.5" /> Back to Standard
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Empty / Welcome State ── */}
                    {!isLoading && !response && !errorMsg && (
                        <div className="text-center py-16 space-y-4">
                            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-3xl flex items-center justify-center border border-cyan-500/20 shadow-2xl shadow-cyan-500/10">
                                <Zap className="w-9 h-9 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg">Ready to solve your doubt</p>
                                <p className="text-slate-500 text-sm mt-1">Type your question above or upload a photo to get started</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-xl mx-auto">
                                {[
                                    { icon: <ListOrdered className="w-5 h-5" />, label: 'Step-by-step', desc: 'Clear, logical breakdown' },
                                    { icon: <Brain className="w-5 h-5" />, label: 'Simplified', desc: 'Easy to understand' },
                                    { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Final Answer', desc: 'Direct answer highlighted' },
                                ].map((f) => (
                                    <div key={f.label} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 text-center">
                                        <div className="w-10 h-10 mx-auto bg-white/5 rounded-xl flex items-center justify-center text-slate-400 mb-3">{f.icon}</div>
                                        <p className="text-white font-bold text-sm">{f.label}</p>
                                        <p className="text-slate-500 text-xs mt-1">{f.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
