"use client"

import { Github, Linkedin, Mail, Sparkles } from "lucide-react"
import Link from "next/link"

export default function Footer() {
    return (
        <footer className="bg-transparent border-t border-gray-100 py-12 px-8 italic">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* Brand Section */}
                    <div className="flex items-center gap-6">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg">
                                D
                            </div>
                            <span className="text-lg font-black tracking-tighter text-gray-900 uppercase italic">
                                DoubtDesk
                            </span>
                        </Link>
                        <div className="hidden md:block w-px h-4 bg-gray-100" />
                        <p className="hidden md:block text-[10px] text-gray-400 font-black uppercase tracking-widest">
                            © 2026 Built by Divya Saxena
                        </p>
                    </div>

                    {/* Links Section */}
                    <div className="flex items-center gap-6">
                        <Link
                            href="https://www.linkedin.com/in/divyasaxena24/"
                            target="_blank"
                            className="text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                            <Linkedin className="w-4 h-4" />
                        </Link>
                        <Link
                            href="https://github.com/divysaxena24/"
                            target="_blank"
                            className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                        >
                            <Github className="w-4 h-4" />
                        </Link>
                        <Link
                            href="mailto:divysaxena2402@gmail.com"
                            className="text-gray-400 hover:text-purple-600 transition-colors cursor-pointer"
                        >
                            <Mail className="w-4 h-4" />
                        </Link>
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg border border-gray-100">
                            <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">v5.0.1</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
