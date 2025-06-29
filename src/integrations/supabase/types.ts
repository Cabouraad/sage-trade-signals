export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      daily_pick: {
        Row: {
          created_at: string | null
          date: string
          entry_price: number
          expected_return: number | null
          id: string
          risk_amount: number | null
          sharpe_ratio: number
          stop_loss: number
          strategy: string
          symbol: string
          target_price: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          entry_price: number
          expected_return?: number | null
          id?: string
          risk_amount?: number | null
          sharpe_ratio: number
          stop_loss: number
          strategy: string
          symbol: string
          target_price: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          entry_price?: number
          expected_return?: number | null
          id?: string
          risk_amount?: number | null
          sharpe_ratio?: number
          stop_loss?: number
          strategy?: string
          symbol?: string
          target_price?: number
          user_id?: string | null
        }
        Relationships: []
      }
      option_history: {
        Row: {
          close: number | null
          date: string
          expiry: string
          iv: number | null
          oi: number | null
          strike: number
          symbol: string
          type: string
        }
        Insert: {
          close?: number | null
          date?: string
          expiry: string
          iv?: number | null
          oi?: number | null
          strike: number
          symbol: string
          type: string
        }
        Update: {
          close?: number | null
          date?: string
          expiry?: string
          iv?: number | null
          oi?: number | null
          strike?: number
          symbol?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "option_history_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["symbol"]
          },
        ]
      }
      price_history: {
        Row: {
          close: number
          date: string
          high: number
          low: number
          open: number
          symbol: string
          volume: number
        }
        Insert: {
          close: number
          date: string
          high: number
          low: number
          open: number
          symbol: string
          volume: number
        }
        Update: {
          close?: number
          date?: string
          high?: number
          low?: number
          open?: number
          symbol?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["symbol"]
          },
        ]
      }
      symbols: {
        Row: {
          symbol: string
        }
        Insert: {
          symbol: string
        }
        Update: {
          symbol?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
