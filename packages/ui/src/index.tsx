import type { ReactNode } from "react";

interface SectionShellProps {
  readonly title: string;
  readonly description?: string;
  readonly children?: ReactNode;
}

export function SectionShell({
  title,
  description,
  children
}: SectionShellProps) {
  return (
    <section>
      <header>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
