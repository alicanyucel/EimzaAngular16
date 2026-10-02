import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, type Routes } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { EImzaDialogComponent } from './app/features/e-imza/components/e-imza-dialog.component';

const routes: Routes = [
  { path: '', redirectTo: 'e-imza', pathMatch: 'full' },
  { path: 'e-imza', component: EImzaDialogComponent },
  { path: '**', redirectTo: 'e-imza' }
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch())
  ]
};
