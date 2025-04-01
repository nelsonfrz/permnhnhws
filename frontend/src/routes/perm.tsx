import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/perm')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="bg-white w-[800px] h-[800px] overflow-hidden flex items-center justify-center">
      <Outlet />
    </div>
  );
}
