import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { Decorator } from "@storybook/react-vite";

// A throwaway in-memory router for the components that call useNavigate(). The
// story renders as the root route's component, so navigations resolve against a
// router that exists only for the workbench. Attach per story, not globally, so
// the pure components stay unwrapped.
export const withRouter: Decorator = (Story) => {
  const rootRoute = createRootRoute({ component: Story });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return <RouterProvider router={router} />;
};
