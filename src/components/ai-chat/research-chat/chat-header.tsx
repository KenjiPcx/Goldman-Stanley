import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { AppNavDropdown } from "@/components/navigation/app-nav-dropdown";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserButton } from "@clerk/clerk-react";
import { CreditsDisplay } from "@/components/navigation/CreditsDisplay";

interface ChatHeaderProps {
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
}

export function ChatHeader({ sidebarOpen, onToggleSidebar }: ChatHeaderProps) {
    return (
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="px-4 py-3 flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onToggleSidebar}
                    className="h-8 w-8 p-0"
                >
                    {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg font-semibold">Research Assistant</h1>
                </div>
                <div className="flex items-center gap-2">
                    <CreditsDisplay />
                    <div className="h-4 w-px bg-border" />
                    <AppNavDropdown />
                    <ThemeToggle />
                    <UserButton />
                </div>
            </div>
        </header>
    );
}

