// src/components/Navigation.jsx
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { getTranslation } from "../translations";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { language } = useLanguage();

  // Configurable navigation items - Easy to extend for future features
  const navItems = [
    { path: "/dashboard", labelKey: "nav.dashboard", icon: "" },
    { path: "/farmer-setup", labelKey: "nav.batches", icon: "" },
  ];

  // Check if current path matches nav item (handles nested routes)
  const isActive = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo/Brand */}
          <div className="flex items-center flex-1 min-w-0">
            <Link to="/dashboard" className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
              <span className="text-xl sm:text-2xl flex-shrink-0"></span>
              <span className="text-base sm:text-xl font-bold text-gray-800 truncate">
                {getTranslation(language, "nav.shrimpSystem")}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive(item.path)
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {getTranslation(language, item.labelKey)}
              </Link>
            ))}
            <div className="ml-4">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Mobile menu button and language switcher */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 active:bg-gray-200 focus:outline-none min-w-[44px] min-h-[44px] touch-manipulation"
              aria-label="Toggle menu"
            >
              <span className="text-xl sm:text-2xl">{isMobileMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3.5 rounded-lg text-sm font-semibold transition-all min-h-[44px] flex items-center touch-manipulation ${
                  isActive(item.path)
                    ? "bg-blue-600 text-white active:bg-blue-700"
                    : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                }`}
              >
                <span className="mr-2 text-base">{item.icon}</span>
                {getTranslation(language, item.labelKey)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}

