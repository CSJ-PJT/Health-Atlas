import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

export const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
  useEffect(() => {
    const background = localStorage.getItem("app_background_hsl");
    if (background) {
      document.documentElement.style.setProperty("--background", background);
    }
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      themes={[
        "light",
        "dark",
        "theme-lavender",
        "theme-iris",
        "theme-rose",
        "theme-ocean",
        "theme-peach",
        "theme-midnight",
        "theme-aurora",
        "theme-sunset",
        "theme-forest",
        "theme-plum",
      ]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
};
