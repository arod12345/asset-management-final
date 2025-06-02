"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Laptop } from "lucide-react"; // Icons for themes

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex space-x-2">
      <Button
        variant={theme === "light" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("light")}
        className={`flex items-center justify-center w-full md:w-auto ${theme === 'light' ? 'bg-primary text-primary-foreground' : ''}`}
      >
        <Sun className="mr-2 h-4 w-4" /> Light
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("dark")}
        className={`flex items-center justify-center w-full md:w-auto ${theme === 'dark' ? 'bg-primary text-primary-foreground' : ''}`}
      >
        <Moon className="mr-2 h-4 w-4" /> Dark
      </Button>
      <Button
        variant={theme === "system" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("system")}
        className={`flex items-center justify-center w-full md:w-auto ${theme === 'system' ? 'bg-primary text-primary-foreground' : ''}`}
      >
        <Laptop className="mr-2 h-4 w-4" /> System
      </Button>
    </div>
  );
}
