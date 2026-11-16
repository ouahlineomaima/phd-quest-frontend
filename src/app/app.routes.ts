import { Routes } from '@angular/router';

export const routes: Routes = [{
  path: '', loadComponent: () => import('./core/layout/shell').then(m => m.Shell),
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
    { path: 'weekly-plan', loadComponent: () => import('./features/weekly-plan/weekly-plan').then(m => m.WeeklyPlan) },
    { path: 'focus', loadComponent: () => import('./features/focus/focus').then(m => m.Focus) },
    { path: 'roadmap', loadComponent: () => import('./features/roadmap/roadmap').then(m => m.Roadmap) },
    { path: 'goals', loadComponent: () => import('./features/goals/goals').then(m => m.Goals) },
    { path: 'achievements', loadComponent: () => import('./features/achievements/achievements').then(m => m.Achievements) },
    { path: 'settings', loadComponent: () => import('./features/settings/settings').then(m => m.Settings) },
    { path: 'help', loadComponent: () => import('./features/help/help').then(m => m.Help) },
    { path: '**', loadComponent: () => import('./core/layout/not-found').then(m => m.NotFound) },
  ],
}];
