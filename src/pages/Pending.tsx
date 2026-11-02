/** Temporary placeholder while a screen is being rebuilt (removed once every route is built). */
import type { PageProps } from "./types";

export function Pending({ route }: PageProps) {
  return (
    <div data-testid={`page-${route.id}`} data-pending className="rounded-card bg-surface p-[30px]">
      <h4 className="text-2xl font-bold">{route.title}</h4>
      <p className="mt-2 text-sm text-muted">This screen is being rebuilt.</p>
    </div>
  );
}
