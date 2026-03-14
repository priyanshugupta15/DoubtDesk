"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type AppUser = {
    id: string;
    name: string;
    email: string;
    supabase?: any; // if your API returns supabase payload too
    supabaseError?: string | null;
};

type UserContextType = {
    appUser: AppUser | null;
    setAppUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
    loading: boolean;
    refresh: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// change this if your route is different
const USER_ENDPOINT = "/api/user";

import SessionTracker from "@/components/auth/SessionTracker";

import { Toaster } from "sonner";

export function Provider({ children }: { children: React.ReactNode }) {
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    async function refresh() {
        setLoading(true);
        try {
            const res = await fetch(USER_ENDPOINT, {
                method: "POST",
                headers: { "content-type": "application/json" },
                // body not needed since server reads currentUser() from Clerk
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                // if unauthorized or server error, just clear state
                setAppUser(null);
                return;
            }

            setAppUser(data as AppUser);
        } catch {
            setAppUser(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void refresh();
    }, []);

    return (
        <UserContext.Provider value={{ appUser, setAppUser, loading, refresh }}>
            <SessionTracker />
            {children}
            <Toaster theme="dark" closeButton />
        </UserContext.Provider>
    );
}

export function useAppUser() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useAppUser must be used inside UserProvider");
    return ctx;
}
