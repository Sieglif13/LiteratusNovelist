import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { BookListComponent } from './catalog/book-list/book-list.component';
import { ReaderComponent } from './library/reader/reader.component';
import { AiChatComponent } from './library/ai-chat/ai-chat.component';

import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { BookDetailPageComponent } from './catalog/book-detail-page/book-detail-page.component';
import { TavernComponent } from './library/tavern/tavern.component';
import { AuthorDetailPageComponent } from './catalog/author-detail-page/author-detail-page.component';
import { CheckoutComponent } from './catalog/checkout/checkout.component';
import { PaymentSuccessComponent } from './catalog/payment-success/payment-success.component';
import { PaymentFailureComponent } from './catalog/payment-failure/payment-failure.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    BookListComponent,
    ReaderComponent,
    AiChatComponent,
    HomeComponent,
    BookDetailPageComponent,
    TavernComponent,
    AuthorDetailPageComponent,
    CheckoutComponent,
    PaymentSuccessComponent,
    PaymentFailureComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CommonModule,
    RouterModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  providers: [
    provideHttpClient(withInterceptors([authInterceptor]))
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
