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
import { AuthorDetailPageComponent } from './catalog/author-detail-page/author-detail-page.component';
import { CheckoutComponent } from './catalog/checkout/checkout.component';
import { PaymentSuccessComponent } from './catalog/payment-success/payment-success.component';
import { PaymentFailureComponent } from './catalog/payment-failure/payment-failure.component';

import { HomeComponent } from './home/home.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'catalog', component: BookListComponent },
  { path: 'book/:slug', component: BookDetailPageComponent },
  { path: 'author/:slug', component: AuthorDetailPageComponent },
  { path: 'checkout/:type/:reference', component: CheckoutComponent, canActivate: [authGuard] },
  { path: 'payment/success', component: PaymentSuccessComponent },
  { path: 'payment/failure', component: PaymentFailureComponent },
  { path: 'tavern', component: TavernComponent, canActivate: [authGuard] },
  { path: 'reader/:id', component: ReaderComponent, canActivate: [authGuard] },
  { path: 'chat/:session_id', component: AiChatComponent, canActivate: [authGuard] },
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
