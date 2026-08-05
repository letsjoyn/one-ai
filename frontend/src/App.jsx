import { Redirect, Route, Switch } from "wouter";
import AppShell from "./layouts/AppShell";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Switch>
                    <Route path="/login" component={LoginPage} />
                    <Route path="/register" component={RegisterPage} />
                    <Route path="/verify-email" component={VerifyEmailPage} />
                    <Route path="/forgot-password" component={ForgotPasswordPage} />
                    <Route path="/reset-password" component={ResetPasswordPage} />
                    <Route path="/accept-invite" component={AcceptInvitePage} />
                    <Route path="/dashboard">
                        <ProtectedRoute>
                            <AppShell>
                                <DashboardPage />
                            </AppShell>
                        </ProtectedRoute>
                    </Route>
                    <Route path="/chat">
                        <ProtectedRoute>
                            <AppShell>
                                <ChatPage />
                            </AppShell>
                        </ProtectedRoute>
                    </Route>
                    <Route path="/settings">
                        <ProtectedRoute>
                            <AppShell>
                                <SettingsPage />
                            </AppShell>
                        </ProtectedRoute>
                    </Route>
                    <Route>
                        <Redirect to="/login" replace />
                    </Route>
                </Switch>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
