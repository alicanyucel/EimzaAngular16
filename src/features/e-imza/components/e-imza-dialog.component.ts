import { Component, EventEmitter, Input, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EImzaService } from '../../../core/services/e-imza.service';
import { DocumentToSign, SignatureStandard, SignResult } from '../../../core/models/e-imza.models';

@Component({
  selector: 'app-e-imza-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="signature-shell">
      <header class="topbar">
        <a class="brand" routerLink="/e-imza" aria-label="E-imza ana sayfa">
          <span class="brand-mark">e</span>
          <span><strong>e-imza</strong><small>GÜVENLİ İŞ AKIŞI</small></span>
        </a>
        <div class="topbar-status">
          <span class="status-dot" [class.is-online]="eimza.availableReaders().length > 0"></span>
          <span>{{ eimza.availableReaders().length ? 'Kart bağlı' : 'Kart bekleniyor' }}</span>
        </div>
      </header>

      <main class="container workspace">
        <section class="page-intro">
          <div>
            <p class="eyebrow">BELGE İŞLEMLERİ <span> / </span> YENİ İMZA</p>
            <h1>Belgeyi imzala<span>.</span></h1>
            <p class="intro-copy">Belge bilgilerini ve kartınızı doğrulayın, ardından güvenli imza sürecini başlatın.</p>
          </div>
          <div class="security-stamp"><span class="stamp-check">✓</span> Nitelikli elektronik imza</div>
        </section>

        <div class="row g-4 align-items-start">
          <div class="col-lg-7">
            <section class="workspace-panel signing-panel">
              <div class="panel-heading">
                <div class="step-number">01</div>
                <div><h2>İmza bilgileri</h2><p>İmzalanacak belgeyi ve yöntemi seçin.</p></div>
              </div>

              <div class="mb-4">
                <label for="documentId" class="form-label">Belge kimliği</label>
                <input id="documentId" class="form-control form-control-lg" [(ngModel)]="documentId"
                  placeholder="Belge ID girin" autocomplete="off">
                <div class="form-hint">Belge kimliği, imza sunucunuzdaki kayıtla eşleşmelidir.</div>
              </div>

              <div class="mb-4">
                <label for="signatureStandard" class="form-label">İmza standardı</label>
                <select id="signatureStandard" class="form-select form-select-lg" [(ngModel)]="standard">
                  <option value="PAdES-BES">PAdES-BES (PDF belge)</option>
                  <option value="PAdES-T">PAdES-T (zaman damgalı PDF)</option>
                  <option value="CAdES-BES">CAdES-BES</option>
                  <option value="CAdES-T">CAdES-T</option>
                  <option value="XAdES-BES">XAdES-BES</option>
                </select>
              </div>

              <div class="reader-field mb-4">
                <div class="d-flex align-items-center justify-content-between gap-3">
                  <label for="reader" class="form-label mb-0">Akıllı kart okuyucu</label>
                  <button class="text-button" type="button" (click)="refreshReaders()" [disabled]="eimza.isSigning()">
                    Yeniden tara
                  </button>
                </div>
                <select id="reader" class="form-select form-select-lg mt-2"
                  [ngModel]="eimza.selectedReader()?.id || ''" (ngModelChange)="onSelectReaderById($event)"
                  [disabled]="!eimza.availableReaders().length">
                  <option value="">{{ eimza.availableReaders().length ? 'Okuyucu seçin' : 'Okuyucu bulunamadı' }}</option>
                  <option *ngFor="let reader of eimza.availableReaders()" [value]="reader.id">
                    {{ reader.name }}{{ reader.cardPresent ? ' · Kart takılı' : ' · Kart yok' }}
                  </option>
                </select>
              </div>

              <div class="mb-4">
                <label for="pin" class="form-label">Kart PIN kodu</label>
                <input id="pin" class="form-control form-control-lg pin-input" type="password"
                  [(ngModel)]="pin" placeholder="PIN kodunuzu girin" autocomplete="current-password">
                <div class="form-hint">PIN kodunuz yalnızca imza sırasında kullanılır.</div>
              </div>

              <div *ngIf="eimza.errorMessage()" class="alert alert-warning d-flex gap-2" role="alert">
                <span aria-hidden="true">!</span><span>{{ eimza.errorMessage() }}</span>
              </div>

              <button class="btn btn-primary btn-lg sign-button" type="button" (click)="onSignClick()"
                [disabled]="eimza.isSigning() || !documentId.trim() || !eimza.selectedReader() || pin.length < 4">
                <span *ngIf="!eimza.isSigning()">İmzalama işlemini başlat <span aria-hidden="true">→</span></span>
                <span *ngIf="eimza.isSigning()"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>İmzalanıyor</span>
              </button>
            </section>
          </div>

          <aside class="col-lg-5">
            <section class="workspace-panel status-panel">
              <div class="panel-heading compact-heading">
                <div class="device-symbol">01</div>
                <div><h2>İmza cihazı</h2><p>Yerel kart servisi durumu</p></div>
                <span class="connection-pill" [class.connected]="eimza.availableReaders().length > 0">
                  {{ eimza.availableReaders().length ? 'Hazır' : 'Bekliyor' }}
                </span>
              </div>

              <div class="device-card" [class.device-ready]="eimza.selectedReader()">
                <div class="device-indicator"><span></span></div>
                <div class="device-copy">
                  <strong>{{ eimza.selectedReader()?.name || 'Akıllı kart okuyucu' }}</strong>
                  <span>{{ eimza.selectedReader() ? 'Kart okuyucu algılandı' : 'Kart servisi bağlantısı bekleniyor' }}</span>
                </div>
                <span class="device-state">{{ eimza.selectedReader() ? 'AKTİF' : 'ÇEVRİMDIŞI' }}</span>
              </div>

              <div *ngIf="eimza.selectedReader() as reader" class="certificate-summary">
                <span class="summary-label">SERTİFİKA SAHİBİ</span>
                <strong>{{ reader.certificate.ownerName }}</strong>
                <span>{{ reader.certificate.issuerName }}</span>
                <span class="certificate-validity">Geçerlilik: {{ reader.certificate.validTo | date:'dd.MM.yyyy' }}</span>
              </div>

              <div class="process-divider"></div>
              <p class="process-title">İMZA AKIŞI</p>
              <ol class="process-list">
                <li class="process-done"><span>1</span><div><strong>Belge özeti hazırlanır</strong><small>İmza sunucusunda SHA-256</small></div></li>
                <li [class.process-active]="eimza.isSigning()"><span>2</span><div><strong>Kart üzerinde imzalanır</strong><small>Özel anahtar karttan çıkmaz</small></div></li>
                <li><span>3</span><div><strong>İmza doğrulanır</strong><small>Sonuç sunucuya iletilir</small></div></li>
              </ol>
            </section>

            <p class="privacy-note"><span aria-hidden="true">✓</span> İmza özel anahtarı akıllı kartınızın dışına çıkarılmaz.</p>
          </aside>
        </div>
      </main>

    </div>
  `
})
export class EImzaDialogComponent implements OnInit {
  public eimza = inject(EImzaService);

  @Input() document!: DocumentToSign;   // required yerine klasik kullanım
  @Input() standard: SignatureStandard = 'PAdES-BES';
  @Output() close = new EventEmitter<void>();
  @Output() completed = new EventEmitter<SignResult>();

  public pin = '';
  public documentId = '';

  async ngOnInit() {
    if (this.document) {
      this.documentId = this.document.id;
    }
    await this.refreshReaders();
  }

  async refreshReaders() {
    try {
      await this.eimza.scanSmartCardReaders();
    } catch {
      // Hata serviste saklanır
    }
  }

  onSelectReaderById(id: string) {
    const found = this.eimza.availableReaders().find(r => r.id === id);
    if (found) this.eimza.selectedReader.set(found);
  }

  async onSignClick() {
    const documentId = this.document?.id || this.documentId.trim();
    if (!documentId) {
      this.eimza.errorMessage.set('İmzalanacak belge kimliğini girin.');
      return;
    }

    try {
      const result = await this.eimza.signDocument(
        documentId,
        this.pin,
        this.standard
      );
      this.completed.emit(result);
      this.close.emit();
    } catch {
      // Hata serviste yakalanır
    }
  }
}
