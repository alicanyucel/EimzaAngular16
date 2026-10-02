import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

interface AnchorRequestPayload {
  anchorName: string;
  documentId: string;
  requestType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface RecordItem {
  id: number;
  name: string;
  email: string;
  status: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  apiUrl = 'https://localhost:7054';
  apiRoute = '/api/Auth/Login';
  bearerToken = '';
  isLoggedIn = false;
  anchorName = '';
  documentId = 'doc-001';
  loginUserName = 'Admin';
  loginPassword = '1';
  requestBody = JSON.stringify({
    emailOrUserName: 'Admin',
    password: '1'
  }, null, 2);
  isLoading = false;
  statusText = 'Hazır';
  lastResponse = '';
  searchTerm = '';
  records: RecordItem[] = [
    { id: 1, name: 'Taner Saydam', email: 'admin@admin.com', status: 'Aktif' },
    { id: 2, name: 'Ayşe Demir', email: 'ayse@demo.com', status: 'Beklemede' },
    { id: 3, name: 'Mehmet Yılmaz', email: 'mehmet@demo.com', status: 'Pasif' }
  ];
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedRecordId: number | null = null;
  recordForm = {
    name: '',
    email: '',
    status: 'Aktif'
  };

  constructor(
    private readonly http: HttpClient,
    private readonly toastr: ToastrService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const savedUrl = localStorage.getItem('eimza.apiUrl');
    const savedToken = localStorage.getItem('eimza.bearerToken');

    if (savedUrl) {
      this.apiUrl = savedUrl;
    }

    if (savedToken) {
      this.bearerToken = savedToken;
    }

    this.isLoggedIn = false;
    this.router.navigate(['/login']);

    if (!this.anchorName) {
      this.anchorName = 'Anchor Demo';
    }
  }

  handleLoginSuccess(token: string): void {
    this.bearerToken = token;
    this.isLoggedIn = true;
    this.statusText = 'Token alındı';
    this.saveSettings();
    this.router.navigate(['/']);
  }

  get fullApiUrl(): string {
    return `${this.apiUrl.replace(/\/+$/, '')}${this.apiRoute}`;
  }

  get loginUrl(): string {
    const baseUrl = this.apiUrl.trim().replace(/\/+$/, '');
    const fullUrl = `${baseUrl}${this.apiRoute}`;
    return fullUrl.endsWith('/api/Auth/Login') ? fullUrl : `${baseUrl}/api/Auth/Login`;
  }

  get curlCommand(): string {
    const payload = this.requestBody.replace(/'/g, "'\\''");
    return `curl -X 'POST' '${this.loginUrl}' \\\n  -H 'accept: */*' \\\n  -H 'Content-Type: application/json' \\\n  -d '${payload}'`;
  }

  get filteredRecords(): RecordItem[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.records;
    }

    return this.records.filter((item) =>
      item.name.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      item.status.toLowerCase().includes(term)
    );
  }

  searchRecords(): void {
    // Arama işlemi görsel olarak filtrelenir.
    this.statusText = this.searchTerm ? 'Arama yapıldı' : 'Hazır';
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.selectedRecordId = null;
    this.recordForm = { name: '', email: '', status: 'Aktif' };
    this.showModal = true;
  }

  openEditModal(item: RecordItem): void {
    this.modalMode = 'edit';
    this.selectedRecordId = item.id;
    this.recordForm = { name: item.name, email: item.email, status: item.status };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedRecordId = null;
    this.recordForm = { name: '', email: '', status: 'Aktif' };
  }

  saveRecord(): void {
    if (!this.recordForm.name.trim() || !this.recordForm.email.trim()) {
      this.toastr.warning('Ad ve e-posta alanları zorunludur.', 'Uyarı');
      return;
    }

    if (this.modalMode === 'create') {
      const nextId = this.records.length ? Math.max(...this.records.map((item) => item.id)) + 1 : 1;
      this.records.unshift({
        id: nextId,
        name: this.recordForm.name.trim(),
        email: this.recordForm.email.trim(),
        status: this.recordForm.status
      });
      this.toastr.success('Kayıt eklendi.', 'Başarılı');
    } else if (this.selectedRecordId) {
      this.records = this.records.map((item) =>
        item.id === this.selectedRecordId
          ? {
              ...item,
              name: this.recordForm.name.trim(),
              email: this.recordForm.email.trim(),
              status: this.recordForm.status
            }
          : item
      );
      this.toastr.success('Kayıt güncellendi.', 'Başarılı');
    }

    this.closeModal();
  }

  deleteRecord(id: number): void {
    this.records = this.records.filter((item) => item.id !== id);
    this.toastr.info('Kayıt silindi.', 'Bilgi');
  }

  saveSettings(): void {
    localStorage.setItem('eimza.apiUrl', this.apiUrl);
    localStorage.setItem('eimza.bearerToken', this.bearerToken);
  }

  applySamplePayload(): void {
    const sample = {
      emailOrUserName: 'Admin',
      password: '1'
    };

    this.requestBody = JSON.stringify(sample, null, 2);
    this.anchorName = this.anchorName || 'Anchor Demo';
  }

  private buildPayload(): AnchorRequestPayload {
    let payload: Record<string, unknown> = {};

    try {
      payload = JSON.parse(this.requestBody || '{}');
    } catch {
      payload = {
        emailOrUserName: 'admin',
        password: '1',
        rawValue: this.requestBody
      };
    }

    return {
      anchorName: this.anchorName || 'Anchor Demo',
      documentId: this.documentId || 'doc-001',
      requestType: 'Create',
      payload,
      createdAt: new Date().toISOString()
    };
  }

  private buildHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });

    if (this.bearerToken.trim()) {
      headers = headers.set('Authorization', `Bearer ${this.bearerToken.trim()}`);
    }

    return headers;
  }

  executeRequest(): Promise<void> {
    return this.login();
  }

  clearRequest(): void {
    this.requestBody = JSON.stringify({
      emailOrUserName: 'Admin',
      password: '1'
    }, null, 2);
    this.lastResponse = '';
    this.statusText = 'Hazır';
  }

  async login(): Promise<void> {
    this.saveSettings();

    try {
      this.isLoading = true;
      this.statusText = 'Giriş yapılıyor...';

      const response = await firstValueFrom(
        this.http.post<any>(this.loginUrl, {
          emailOrUserName: this.loginUserName,
          password: this.loginPassword
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
        throw new Error('API cevaplarında token bulunamadı.');
      }

      this.bearerToken = token;
      localStorage.setItem('eimza.bearerToken', token);
      this.lastResponse = JSON.stringify(response, null, 2);
      this.statusText = 'Token alındı';
      this.toastr.success('Giriş başarılı. Token alındı.', 'Başarılı');

      await Swal.fire({
        title: 'Giriş başarılı',
        text: 'JWT token alındı ve saklandı.',
        icon: 'success',
        confirmButtonText: 'Tamam',
        confirmButtonColor: '#0f766e'
      });
    } catch (error: any) {
      const reason = error?.error?.message || error?.message || 'Giriş sırasında hata oluştu.';
      this.statusText = 'Hata';
      this.lastResponse = JSON.stringify(error?.error ?? error ?? {}, null, 2);
      this.toastr.error(reason, 'Giriş başarısız');

      await Swal.fire({
        title: 'Giriş başarısız',
        text: reason,
        icon: 'error',
        confirmButtonText: 'Tekrar dene',
        confirmButtonColor: '#be123c'
      });
    } finally {
      this.isLoading = false;
    }
  }

  async sendRequest(): Promise<void> {
    this.saveSettings();

    if (!this.bearerToken) {
      this.toastr.warning('Önce giriş yapıp token alın.', 'Uyarı');
      return;
    }

    const requestPayload = this.buildPayload();

    try {
      this.isLoading = true;
      this.statusText = 'İstek gönderiliyor...';

      const response = await firstValueFrom(
        this.http.post<any>(this.fullApiUrl, requestPayload, {
          headers: this.buildHeaders()
        })
      );

      this.lastResponse = JSON.stringify(response, null, 2);
      this.statusText = 'Başarılı';
      this.toastr.success('API isteği başarıyla iletildi.', 'Başarılı');
    } catch (error: any) {
      const reason = error?.error?.message || error?.message || 'Sunucu isteği sırasında hata oluştu.';
      this.statusText = 'Hata';
      this.lastResponse = JSON.stringify(error?.error ?? error ?? {}, null, 2);
      this.toastr.error(reason, 'İşlem başarısız');
    } finally {
      this.isLoading = false;
    }
  }
}
