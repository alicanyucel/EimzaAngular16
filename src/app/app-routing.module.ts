import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EImzaDialogComponent } from '../features/e-imza/components/e-imza-dialog.component';

const routes: Routes = [
  { path: '', redirectTo: 'e-imza', pathMatch: 'full' },
  { path: 'e-imza', component: EImzaDialogComponent },
  { path: '**', redirectTo: 'e-imza' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
