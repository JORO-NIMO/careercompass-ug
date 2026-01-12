import { Json } from "@/integrations/supabase/types";

export type ColumnType = 'string' | 'number' | 'currency' | 'date' | 'tag' | 'link' | 'boolean';

export interface ColumnDefinition {
    key: string;
    label: string;
    type: ColumnType;
    hidden?: boolean;
    required?: boolean;
    format?: string;
    transform?: string; // Potential JS-snippet for derived values
}

export interface DataCollection {
    id: string;
    name: string;
    description: string | null;
    is_published: boolean;
    config: Json;
    created_at: string;
    updated_at: string;
}

export interface DataDefinition {
    id: string;
    collection_id: string;
    version: number;
    is_active: boolean;
    columns: ColumnDefinition[];
    created_at: string;
}

export interface DataEntry {
    id: string;
    collection_id: string;
    raw_content: Record<string, any>;
    metadata: Json;
    created_at: string;
}
