import type { Tables } from '@/integrations/supabase/types';

export type AdminCompanySummary = Pick<Tables<'companies'>, 'id' | 'name'>;

export type ListingWithCompany = Tables<'listings'> & {
  companies: AdminCompanySummary | null;
};

export type AdminListing = ListingWithCompany;

export interface AdminListingsCollection {
  items: AdminListing[];
}

export interface AdminAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminAdsCollection {
  items: AdminAd[];
}

export interface AdminBoost {
  id: string;
  entity_id: string;
  entity_type: 'company' | 'listing';
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  payment_id: string | null;
  created_at: string;
}

export interface AdminBoostsCollection {
  items: AdminBoost[];
}

export interface BulletBalance {
  owner_id: string;
  balance: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface BulletTransaction {
  id: string;
  owner_id: string;
  delta: number;
  reason: string;
  created_at: string;
  created_by: string;
}

export interface AdminBulletList {
  items: BulletBalance[];
}

export interface AdminBulletDetail {
  balance: BulletBalance;
  transactions: BulletTransaction[];
}

export type AdminBulletResponse = AdminBulletDetail | (AdminBulletDetail & AdminBulletList) | AdminBulletList;

export type AdminPlacement = Tables<'placements'>;

export type AdminProfile = Tables<'profiles'>;
