export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          trip_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          trip_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Insert"]>;
        Relationships: [];
      };
      preferences: {
        Row: {
          confirmed: boolean;
          created_at: string;
          expires_at: string;
          id: string;
          key: string;
          trip_id: string | null;
          user_id: string;
          value: string;
        };
        Insert: {
          confirmed?: boolean;
          created_at?: string;
          expires_at?: string;
          id?: string;
          key: string;
          trip_id?: string | null;
          user_id: string;
          value: string;
        };
        Update: Partial<Database["public"]["Tables"]["preferences"]["Insert"]>;
        Relationships: [];
      };
      trip_images: {
        Row: {
          accepted: boolean;
          byte_size: number;
          created_at: string;
          id: string;
          mime_type: string;
          storage_path: string;
          trip_id: string;
          user_id: string;
        };
        Insert: {
          accepted?: boolean;
          byte_size: number;
          created_at?: string;
          id?: string;
          mime_type: string;
          storage_path: string;
          trip_id: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["trip_images"]["Insert"]>;
        Relationships: [];
      };
      trips: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          mode: string;
          public_state: Json;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          mode?: string;
          public_state?: Json;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["trips"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
