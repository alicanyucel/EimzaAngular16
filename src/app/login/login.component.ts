import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  @Input() apiUrl = 'https://localhost:7054';
  @Output() loginSuccess = new EventEmitter<string>();

  emailOrUserName = 'Admin';
  password = '1';
  isLoading = false;

  constructor(
    private readonly http: HttpClient,
    private readonly toastr: ToastrService
  ) {}

  get loginUrl(): string {
    const baseUrl = this.apiUrl.trim().replace(/\/+$/, '');
    return baseUrl.endsWith('/api/Auth/Login') ? baseUrl : `${baseUrl}/api/Auth/Login`;
  }

  async login(): Promise<void> {
    try {
      this.isLoading = true;

      const response = await firstValueFrom(
        this.http.post<any>(this.loginUrl, {
          emailOrUserName: this.emailOrUserName,
          password: this.password
        })
      );

      const token =
        response?.token ??
        response?.accessToken ??
        response?.data?.token ??
        response?.result?.token ??
        response?.jwt ??
        response?.access_token ??
        response?.tokenValue;

      if (!token) {
        throw new Error('Token bulunamadı.');
      }

      localStorage.setItem('eimza.apiUrl', this.apiUrl);
      localStorage.setItem('eimza.bearerToken', token);

      this.toastr.success('Giriş başarılı. Ana sayfaya yönlendiriliyorsunuz.', 'Başarılı');
      this.loginSuccess.emit(token);
    } catch (error: any) {
      const reason = error?.error?.message || error?.message || 'Giriş başarısız oldu.';
      this.toastr.error(reason, 'Hata');
    } finally {
      this.isLoading = false;
    }
  }
}
