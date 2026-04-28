import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { BookListComponent } from './catalog/book-list/book-list.component';
import { ReaderComponent } from './library/reader/reader.component';
import { AiChatComponent } from './library/ai-chat/ai-chat.component';
import { authGuard } from './core/guards/auth.guard';

import { HomeComponent } from './home/home.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'catalog', component: BookListComponent },
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
