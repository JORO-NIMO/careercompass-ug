export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    areas_of_interest: string[] | null
                    location: string | null
                    experience_level: string | null
                    availability_status: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    areas_of_interest?: string[] | null
                    location?: string | null
                    experience_level?: string | null
                    availability_status?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    areas_of_interest?: string[] | null
                    location?: string | null
                    experience_level?: string | null
                    availability_status?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            companies: {
                Row: {
                    id: string
                    name: string
                    owner_id: string
                    approved: boolean
                    created_at: string
                    updated_at: string
                }
            }
            placements: {
                Row: {
                    id: string
                    position_title: string
                    company_name: string
                    description: string
                    created_at: string | null
                }
            }
        }
    }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
