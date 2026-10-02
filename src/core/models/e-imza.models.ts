export type SignatureStandard = 'PAdES-BES' | 'PAdES-T' | 'CAdES-BES' | 'CAdES-T' | 'XAdES-BES';

export interface SmartCardCertificate {
  ownerName: string;
  tcKimlikNo: string;
  issuerName: string;
  validFrom: string;
  validTo: string;
  serialNumber: string;
  rawBase64: string;
  isQualified: boolean;
}

export interface SmartCardReader {
  id: string;
  name: string;
  slotId: number;
  cardPresent: boolean;
  atr: string;
  certificate: SmartCardCertificate;
}

export interface PrepareSignRequest {
  documentId: string;
  standard: SignatureStandard;
  signerCertificateBase64: string;
}

export interface PrepareSignResponse {
  sessionId: string;
  documentId: string;
  digestBase64: string;
  hashAlgorithm: string;
  signingTime: string;
}

export interface SignHashPayload {
  readerId: string;
  slotId: number;
  pin: string;
  digestBase64: string;
  hashAlgorithm: string;
}

export interface CardSignResult {
  signatureBase64: string;
  algorithm: string;
  signedAt: string;
}

export interface CompleteSignRequest {
  sessionId: string;
  documentId: string;
  signatureValueBase64: string;
  certificateBase64: string;
  signingTime: string;
}

export interface SignResult {
  signatureId: string;
  documentId: string;
  signedDocumentUrl: string;
  signerName: string;
  signerTckn: string;
  issuer: string;
  timestampUsed: boolean;
  timestampTime?: string;
  status: 'SUCCESS' | 'FAILED';
  verificationDetails: {
    hashValid: boolean;
    certificateChainValid: boolean;
    ocspValid: boolean;
    nesValid: boolean;
  };
}

export interface DocumentToSign {
  id: string;
  title: string;
  fileName: string;
  sha256Hash: string;
  fileSize: string;
}