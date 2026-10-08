import type React from "react";

type Props = {
  children: React.ReactNode;
};
export default function SimpleLayout({ children }: Props) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
