import { Injectable } from '@angular/core';
import { SmartCardReader, SignHashPayload, CardSignResult } from '../models/e-imza.models';

@Injectable({
  providedIn: 'root'
})
export class SmartCardLocalService {
  // Yerel E-İmza Servisi Portları (KamuSM: 9002, ArkSigner: 4443 / 8080, Özel Ajan: 9002)
  private readonly wsUrls = [
    'wss://127.0.0.1:9002/eimza',
    'wss://localhost:9002/eimza',
    'https://127.0.0.1:9002/api/card'
  ];

  private socket: WebSocket | null = null;
  private isConnected = false;

  /**
   * Yerel bilgisayarda çalışan Akis / PKCS#11 servisine bağlanır
   */
  async connect(): Promise<boolean> {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      return true;
    }

    return new Promise((resolve) => {
      try {
        this.socket = new WebSocket(this.wsUrls[0]);

        this.socket.onopen = () => {
          this.isConnected = true;
          console.log('[E-İmza] Yerel Kart Ajanına bağlanıldı (wss://127.0.0.1:9002)');
          resolve(true);
        };

        this.socket.onerror = () => {
          this.isConnected = false;
          resolve(false);
        };

        this.socket.onclose = () => {
          this.isConnected = false;
        };

        // 3 saniye içinde yanıt gelmezse timeout
        setTimeout(() => {
          if (!this.isConnected) resolve(false);
        }, 3000);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Takılı olan USB Kart Okuyucuları ve NES (Nitelikli Elektronik Sertifikaları) listeler
   */
  async getReaders(): Promise<SmartCardReader[]> {
    const connected = await this.connect();
    
    // Eğer yerel WebSocket ajanı aktif değilse, tarayıcı veya REST fallback dener
    if (!connected) {
      return this.fetchReadersViaHttpFallback();
    }

    return new Promise((resolve, reject) => {
      const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
      
      const handler = (event: MessageEvent) => {
        try {
          const res = JSON.parse(event.data);
          if (res.requestId === requestId) {
            this.socket?.removeEventListener('message', handler);
            if (res.success) {
              resolve(res.readers);
            } else {
              reject(new Error(res.error || 'Okuyucular okunamadı.'));
            }
          }
        } catch (e) {
          reject(e);
        }
      };

      this.socket?.addEventListener('message', handler);
      this.socket?.send(JSON.stringify({
        action: 'LIST_READERS',
        requestId: requestId
      }));

      // 5 saniye zaman aşımı
      setTimeout(() => {
        this.socket?.removeEventListener('message', handler);
        reject(new Error('Kart okuyucu araması zaman aşımına uğradı.'));
      }, 5000);
    });
  }

  /**
   * Hash özetini akıllı kart üzerindeki Özel Anahtar (Private Key) ile imzalar
   * ÖNEMLİ: Özel anahtar asla karttan dışarı çıkmaz, imzalama donanım çipinde gerçekleşir!
   */
  async signHash(payload: SignHashPayload): Promise<CardSignResult> {
    const connected = await this.connect();
    if (!connected) {
      throw new Error('Yerel kart servisi ile bağlantı kurulamadı.');
    }

    return new Promise((resolve, reject) => {
      const requestId = 'sign_' + Math.random().toString(36).substring(2, 9);

      const handler = (event: MessageEvent) => {
        try {
          const res = JSON.parse(event.data);
          if (res.requestId === requestId) {
            this.socket?.removeEventListener('message', handler);
            if (res.success) {
              resolve({
                signatureBase64: res.signatureBase64,
                algorithm: res.algorithm || 'RSA-SHA256',
                signedAt: new Date().toISOString()
              });
            } else {
              // Yanlış PIN, Kilitli Kart vs. hata kodları
              reject(new Error(res.error || 'İmzalama işlemi akıllı kart tarafından reddedildi.'));
            }
          }
        } catch (e) {
          reject(e);
        }
      };

      this.socket?.addEventListener('message', handler);
      this.socket?.send(JSON.stringify({
        action: 'SIGN_HASH',
        requestId: requestId,
        payload: {
          readerId: payload.readerId,
          slotId: payload.slotId,
          pin: payload.pin,
          digestBase64: payload.digestBase64,
          algorithm: 'SHA256'
        }
      }));

      // Kart donanımı için 15 saniye zaman aşımı
      setTimeout(() => {
        this.socket?.removeEventListener('message', handler);
        reject(new Error('İmzalama zaman aşımı. Kart okuyucuyu kontrol ediniz.'));
      }, 15000);
    });
  }

  private async fetchReadersViaHttpFallback(): Promise<SmartCardReader[]> {
    try {
      const res = await fetch('http://127.0.0.1:9002/api/readers', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Sessiz kal
    }
    throw new Error('Yerel E-İmza Servisi bulunamadı. Lütfen masaüstü uygulamasını başlatın.');
  }
}