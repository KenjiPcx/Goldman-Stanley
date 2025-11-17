import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MessageSquare, Database, Search, Shield, BookOpen, Settings, Bot, GitBranch, ClipboardCheck, FileCheck } from "lucide-react";
import { useUser } from "@/contexts/user-context";

export function AppNavDropdown() {
    const { isAdmin } = useUser();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    Navigate <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                    <Link to="/research-chat" className="cursor-pointer">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Research Chat
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link to="/datasets" className="cursor-pointer">
                        <Search className="h-4 w-4 mr-2" />
                        Dataset Viewer
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link to="/reviews" className="cursor-pointer">
                        <FileCheck className="h-4 w-4 mr-2" />
                        Review Configs
                    </Link>
                </DropdownMenuItem>
                {isAdmin && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/admin" className="cursor-pointer">
                                <Shield className="h-4 w-4 mr-2" />
                                Admin Dashboard
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link to="/blog/admin" className="cursor-pointer">
                                <Settings className="h-4 w-4 mr-2" />
                                Blog Admin
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/agents" className="cursor-pointer">
                                <Bot className="h-4 w-4 mr-2" />
                                Agents
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link to="/workflow-builder" className="cursor-pointer">
                                <GitBranch className="h-4 w-4 mr-2" />
                                Workflow Builder
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link to="/reviews" className="cursor-pointer">
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                Review Configs
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}


