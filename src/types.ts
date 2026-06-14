export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELED = 'canceled'
}

export enum PaymentMethod {
  BANK = 'bank',
  WHATSAPP = 'whatsapp',
  EZ_CASH = 'ez_cash',
  PAYHERE = 'payhere',
  BINANCE = 'binance',
  WALLET = 'wallet'
}

export interface Package {
  id: string;
  name: string;
  gameId: string;
  diamonds: number;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: number;
}

export interface Order {
  id: string;
  packageId: string;
  packageName: string;
  diamonds: number;
  userId: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
  amount: number;
  status: OrderStatus;
  paymentProofUrl?: string;
  adminNotes?: string;
  createdAt: number;
  referenceNumber?: string;
}

export interface Game {
  id: string;
  name: string;
  image: string;
  category: string;
  tag: string;
  comingSoon?: boolean;
  idLabel?: string;
  idPlaceholder?: string;
  isActive: boolean;
  createdAt: number;
}

export interface Settings {
  siteName: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  whatsappNumber: string;
  ezCashNumber: string;
  payhereMerchantId?: string;
  payhereAppId?: string;
  payhereAppSecret?: string;
  isPayhereEnabled?: boolean;
  binancePayId?: string;
  binanceAddress?: string;
  isBinanceEnabled?: boolean;
  isWalletEnabled?: boolean;
  logoUrl?: string;
  heroBannerUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  isMaintenanceMode?: boolean;
  usdRate?: number;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  bannerUrl?: string;
  isActive: boolean;
  createdAt: number;
}

export interface ServiceTemplate {
  id: string;
  serviceId: string;
  name: string;
  imageUrl: string;
  price: number;
  isActive: boolean;
  createdAt: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  date: string;
  isActive: boolean;
  createdAt: number;
}

export interface AccountListing {
  id: string;
  title: string;
  description: string;
  price: number;
  level: number;
  rank: string;
  ffId: string;
  rareItems: string[];
  images: string[];
  isSold: boolean;
  isActive: boolean;
  createdAt: number;
  region: string;
}

export interface AccountOrder {
  id: string;
  accountId: string;
  accountTitle: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentProofUrl?: string;
  createdAt: number;
  referenceNumber?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  target: 'admin' | 'all';
  createdAt: number;
}

export enum WalletTransactionType {
  TOPUP = 'topup',
  DEBIT = 'debit',
  MANUAL = 'manual'
}

export enum WalletTransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface WalletTransaction {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  type: WalletTransactionType;
  status: WalletTransactionStatus;
  paymentMethod?: string;
  paymentProofUrl?: string;
  createdAt: number;
  adminNotes?: string;
  referenceNumber?: string;
}
