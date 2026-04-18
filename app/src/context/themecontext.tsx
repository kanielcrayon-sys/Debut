"use client"
import {createContext} from "react";

type ThemeContextType = {
  theme: string;
  setTheme: (theme: string) => void;
};

export const Mycontext = createContext<ThemeContextType | null>(null);
