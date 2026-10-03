export type PlotStatus = 'Available' | 'Reserved' | 'Sold';

export type UserRole = 'admin' | 'moderator' | 'user' | 'registered_user' | 'dealer' | 'seller';

export type PlotType = 'Plot' | 'File' | 'House' | 'Commercial';

export type PlotSize = 
  | '5 Marla'
  | '10 Marla'
  | '1 Kanal'
  | '2 Kanal'
  | '4 Marla Commercial'
  | '8 Marla Commercial';

export interface PaymentPlan {
  downPayment: number;
  monthlyInstallments: number;
  numberOfInstallments: number;
  developmentChargesIncluded: boolean;
  developmentChargesAmount?: number;
  possessionPeriodMonths: number;
  ballotingCharges?: number;
}

export interface PlotRecord {
  id: string;
  society: string;
  sector: string;
  block: string;
  plotNumber: string;
  size: PlotSize;
  price: number;
  type: PlotType;
  status: PlotStatus;
  coordinates: [number, number][]; // Lat/Lng polygon points
  center: [number, number]; // [lat, lng] center point
  dimensions: string;
  facing: string;
  roadWidth: string;
  paymentPlan: PaymentPlan;
  images: string[];
  videoUrl?: string;
  documents?: { name: string; url: string }[];
  bedrooms?: string;
  bathrooms?: string;
  fileStatus?: string;
  features: string[];
  description: string;
  balloted: boolean;
  ballotingDate?: string;
  fileNumber?: string;
  isCorner?: boolean;
  isParkFacing?: boolean;
  isMainBoulevard?: boolean;
  sellerUid?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerWhatsapp?: string;
  agencyName?: string;
  agencyLogo?: string;
  isVerifiedSeller?: boolean;
}

export interface SellerVerificationItem {
  id: string;
  userId: string;
  applicantName: string;
  whatsapp: string;
  cnic: string;
  agencyName?: string;
  officeAddress?: string;
  documentUrl?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

export interface LeadRecord {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  plotId?: string;
  plotDetails?: string;
  message: string;
  inquiryType: 'Site Visit' | 'Booking' | 'General Inquiry' | 'File Verification';
  date: string;
  status: 'New' | 'Contacted' | 'Closed';
}

export interface FileVerificationRecord {
  fileNumber: string;
  ownerName: string;
  plotSize: PlotSize;
  sector: string;
  block: string;
  registrationDate: string;
  status: 'Verified & Balloted' | 'Under Clearance' | 'Pending LDA Allocation';
  duesCleared: boolean;
  barCode: string;
}

export interface FilterState {
  society: string;
  sector: string;
  block: string;
  plotNumber: string;
  size: string;
  type: string;
  status: string;
  minPrice: number;
  maxPrice: number;
  searchQuery: string;
}
