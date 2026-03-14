"use client"

import { useState } from "react"
import { SignInButton, SignedIn, SignedOut, UserButton, SignOutButton } from "@clerk/nextjs"
import Sidebar from "@/components/Sidebar"
import { FileText, Map, MessageCircle, FileEdit, Menu, Lightbulb, Sparkles, ArrowRight, TrendingUp, Target, Zap, ShieldCheck } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
    return (
        <div className="p-8 lg:p-16 space-y-12 max-w-7xl mx-auto pb-24">
            {/* Dashboard Heading */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-white/5">
                <div className="space-y-1">
                    <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
                        Dash<span className="text-blue-500">board</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium tracking-tight">
                        Welcome to <span className="text-blue-400/80">DoubtDesk</span>. Your new workspace is ready.
                    </p>
                </div>
            </header>

            <section className="min-h-[400px] flex items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02]">
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Zap className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Clean Slate</h2>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        All previous content has been removed. Start building your new features here.
                    </p>
                </div>
            </section>
        </div>
    )
}
