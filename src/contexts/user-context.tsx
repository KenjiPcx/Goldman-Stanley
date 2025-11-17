import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

type UserProfile = Doc<"userProfiles"> | null | undefined;

interface UserContextType {
    user: UserProfile;
    isAdmin: boolean;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const user = useQuery(api.auth.users.getCurrentUserProfile);

    const contextValue: UserContextType = {
        user,
        isAdmin: user?.role === "admin",
        isLoading: user === undefined,
    };

    return (
        <UserContext.Provider value={contextValue}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}

