import "./globals.css";

export const metadata = {
  title: "DeepStake Web Prototype",
  description: "Browser-based chunk world simulation prototype for DeepStake3D"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
