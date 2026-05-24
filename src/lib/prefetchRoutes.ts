// Kick off background downloads for all lazy route chunks
// right after the app first renders, so they're ready by the
// time the user navigates there.
export function prefetchAllRoutes() {
  const chunks = [
    () => import('../pages/Workouts'),
    () => import('../pages/WorkoutPlan'),
    () => import('../pages/Exercises'),
    () => import('../pages/CreateWorkout'),
    () => import('../pages/ActiveWorkout'),
    () => import('../pages/CoachDashboard'),
    () => import('../pages/ProgramBuilder'),
    () => import('../pages/Marketplace'),
    () => import('../pages/ProgramDetail'),
    () => import('../pages/Messages'),
    () => import('../pages/CoachPublicProfile'),
    () => import('../pages/NotFound'),
    () => import('../pages/AuthGate'),
  ];

  const run = () => chunks.forEach((load) => load().catch(() => {}));

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 1000);
  }
}
