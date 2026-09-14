import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

function ThemeToggle({ className = "" }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";
    const Icon = isDark ? Sun : Moon;
    const targetTheme = isDark ? "light" : "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`icon-button ${className}`}
            aria-label={`Switch to ${targetTheme} mode`}
            title={`Switch to ${targetTheme} mode`}
        >
            <Icon size={15} />
        </button>
    );
}

export default ThemeToggle;
