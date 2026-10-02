import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SmartCardLocalService } from './smartcard-local.service';
import { 
  PrepareSignRequest, 
  PrepareSignResponse, 
  CompleteSignRequest, 
  SignResult,
  SmartCardReader,
  SignatureStandard 
} from '../models/e-imza.models';

@Injectable({
  providedIn: 'root'
})
export class EImzaService {
  private http = inject(HttpClient);
  private smartCard = inject(SmartCardLocalService);

  // Backend .NET Core Web API adresi
  private readonly apiUrl = 'https://localhost:7154/api/signature';

  // Signals ile anlık durum yönetimi
  public readonly isSigning = signal<boolean>(false);
  public readonly currentStep = signal<string>('Hazır');
  public readonly availableReaders = signal<SmartCardReader[]>([]);
  public readonly selectedReader = signal<SmartCardReader | null>(null);
  public readonly lastResult = signal<SignResult | null>(null);
  public readonly errorMessage = signal<string | null>(null);

  /**
   * Yerel bilgisayara takılı akıllı kart okuyucuları tarar
   */
  async scanSmartCardReaders(): Promise<SmartCardReader[]> {
    this.currentStep.set('Kart okuyucular taranıyor...');
    this.errorMessage.set(null);
    try {
      const readers = await this.smartCard.getReaders();
      this.availableReaders.set(readers);
      if (readers.length > 0) {
        this.selectedReader.set(readers[0]);
      }
      return readers;
    } catch (err: any) {
      this.errorMessage.set('Kart okuyucu servisine bağlanılamadı. Yerel E-İmza istemcisinin çalıştığından emin olun.');
      throw err;
    }
  }

  /**
   * Tam E-İmza Akışını Başlatır (PAdES / CAdES)
   * 1. .NET Web API'den belge özetini (SHA-256 Digest) alır
   * 2. Yerel Akıllı Kart'a (Akis/SafeNet) özet gönderilir ve PIN ile imzalatılır
   * 3. İmzalı veri ve sertifika .NET Web API'ye iletilir ve belge mühürlenir
   */
  async signDocument(
    documentId: string, 
    pin: string, 
    standard: SignatureStandard = 'PAdES-BES'
  ): Promise<SignResult> {
    const reader = this.selectedReader();
    if (!reader) {
      throw new Error('Lütfen bir akıllı kart okuyucu seçin.');
    }
    if (!pin || pin.length < 4) {
      throw new Error('Geçerli bir akıllı kart PIN kodu giriniz.');
    }

    this.isSigning.set(true);
    this.errorMessage.set(null);

    try {
      // ADIM 1: .NET Core Web API'den Belge Özetini (Digest) İste
      this.currentStep.set('1/3 - .NET Web API: Belge özeti (Hash) hesaplanıyor...');
      const preparePayload: PrepareSignRequest = {
        documentId,
        standard,
        signerCertificateBase64: reader.certificate.rawBase64
      };

      const prepResponse = await firstValueFrom(
        this.http.post<PrepareSignResponse>(`${this.apiUrl}/prepare`, preparePayload)
      );

      // ADIM 2: Yerel Akıllı Kart Üzerinde Özeti İmzala (PKCS#11)
      this.currentStep.set('2/3 - Akıllı Kart: Donanımsal imzalama yapılıyor...');
      const cardSignature = await this.smartCard.signHash({
        readerId: reader.id,
        slotId: reader.slotId,
        pin: pin,
        digestBase64: prepResponse.digestBase64,
        hashAlgorithm: prepResponse.hashAlgorithm
      });

      // ADIM 3: İmzayı .NET Web API'ye İlet ve Belgeyi Tamamla
      this.currentStep.set('3/3 - .NET Web API: İmza doğrulanıyor ve zaman damgası ekleniyor...');
      const completePayload: CompleteSignRequest = {
        sessionId: prepResponse.sessionId,
        documentId: documentId,
        signatureValueBase64: cardSignature.signatureBase64,
        certificateBase64: reader.certificate.rawBase64,
        signingTime: new Date().toISOString()
      };

      const signResult = await firstValueFrom(
        this.http.post<SignResult>(`${this.apiUrl}/complete`, completePayload)
      );

      this.lastResult.set(signResult);
      this.currentStep.set('İmzalama başarıyla tamamlandı!');
      return signResult;
    } catch (error: any) {
      const msg = error.error?.message || error.message || 'İmzalama sırasında bir hata oluştu.';
      this.errorMessage.set(msg);
      throw error;
    } finally {
      this.isSigning.set(false);
    }
  }
}