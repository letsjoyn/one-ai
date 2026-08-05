import { Redirect } from "wouter";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    const sessionIsBeingCommitted = !isAuthenticated && Boolean(localStorage.getItem("token"));

    if (loading || sessionIsBeingCommitted) {
        return (
            <div className="grid min-h-screen place-items-center bg-canvas text-primary">
                <div className="flex items-center gap-3 text-sm text-secondary">
                    <span className="h-2 w-2 animate-pulse bg-accent" />
                    Loading workspace...
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Redirect to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
