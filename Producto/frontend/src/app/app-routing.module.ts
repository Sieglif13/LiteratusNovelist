import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { BookListComponent } from './catalog/book-list/book-list.component';
import { BookDetailPageComponent } from './catalog/book-detail-page/book-detail-page.component';
import { ReaderComponent } from './library/reader/reader.component';
import { AiChatComponent } from './library/ai-chat/ai-chat.component';
import { TavernComponent } from './library/tavern/tavern.component';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { AuthorDetailPageComponent } from './catalog/author-detail-page/author-detail-page.component';
import { CheckoutComponent } from './catalog/checkout/checkout.component';
import { PaymentSuccessComponent } from './catalog/payment-success/payment-success.component';
import { PaymentFailureComponent } from './catalog/payment-failure/payment-failure.component';
import { LibraryListComponent } from './library/library-list/library-list.component';

import { HomeComponent } from './home/home.component';

import { ProfileComponent } from './users/profile/profile.component';
import { AuthorListComponent } from './catalog/author-list/author-list.component';
import { CharacterHubComponent } from './characters/character-hub/character-hub.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'catalog', component: BookListComponent },
  { path: 'authors', component: AuthorListComponent },
  { path: 'characters', component: CharacterHubComponent },
  { path: 'book/:slug', component: BookDetailPageComponent },
  { path: 'author/:slug', component: AuthorDetailPageComponent },
  { path: 'checkout/:type/:reference', component: CheckoutComponent, canActivate: [authGuard] },
  { path: 'payment/success', component: PaymentSuccessComponent },
  { path: 'payment/failure', component: PaymentFailureComponent },
  { path: 'library', component: LibraryListComponent, canActivate: [authGuard] },
  { path: 'tavern', component: TavernComponent, canActivate: [authGuard] },
  { path: 'reader/:id', component: ReaderComponent, canActivate: [authGuard] },
  { path: 'chat/:session_id', component: AiChatComponent, canActivate: [authGuard] },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [adminGuard]
  },
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
