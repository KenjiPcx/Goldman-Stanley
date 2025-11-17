import {
    Authenticated,
    Unauthenticated,
} from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Link } from "@tanstack/react-router";
import { BatchResearchDashboard } from "@/components/research/batch-research-dashboard";
import { AppNavDropdown } from "@/components/navigation/app-nav-dropdown";

export default function DatasetsPage() {
    return (
        <>
            <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-3">
                        <span className="text-xl font-bold">Goldman Stanley</span>
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <AppNavDropdown />
                    <ThemeToggle />
                    <UserButton />
                </div>
            </header>
            <main className="p-8 flex flex-col gap-8">
                <Authenticated>
                    <div className="flex flex-col gap-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Dataset Viewer</h2>
                        </div>
                        <BatchResearchDashboard />
                    </div>
                </Authenticated>
                <Unauthenticated>
                    <SignInForm />
                </Unauthenticated>
            </main>
        </>
    );
}

function SignInForm() {
    return (
        <div className="flex flex-col gap-8 w-96 mx-auto">
            <p>Log in to access Goldman Stanley</p>
            <SignInButton mode="modal">
                <button className="bg-foreground text-background px-4 py-2 rounded-md">
                    Sign in
                </button>
            </SignInButton>
            <SignUpButton mode="modal">
                <button className="bg-foreground text-background px-4 py-2 rounded-md">
                    Sign up
                </button>
            </SignUpButton>
        </div>
    );
}

