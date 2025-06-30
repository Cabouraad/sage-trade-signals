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
          entry: number
          kelly_frac: number | null
          pick_ts: string
          reason_bullets: string[] | null
          size_pct: number | null
          stop: number
          symbol: string
          target: number
          trade_type: string
        }
        Insert: {
          entry: number
          kelly_frac?: number | null
          pick_ts?: string
          reason_bullets?: string[] | null
          size_pct?: number | null
          stop: number
          symbol: string
          target: number
          trade_type: string
        }
        Update: {
          entry?: number
          kelly_frac?: number | null
          pick_ts?: string
          reason_bullets?: string[] | null
          size_pct?: number | null
          stop?: number
          symbol?: string
          target?: number
          trade_type?: string
        }
        Relationships: []
      }
      dark_pool_activity: {
        Row: {
          created_at: string | null
          dollar_volume: number
          id: string
          shares: number
          symbol: string
          trade_date: string
        }
        Insert: {
          created_at?: string | null
          dollar_volume: number
          id?: string
          shares: number
          symbol: string
          trade_date: string
        }
        Update: {
          created_at?: string | null
          dollar_volume?: number
          id?: string
          shares?: number
          symbol?: string
          trade_date?: string
        }
        Relationships: []
      }
      macro_state: {
        Row: {
          dxy: number | null
          move: number | null
          risk_regime: string | null
          snapshot_ts: string
          vix: number | null
        }
        Insert: {
          dxy?: number | null
          move?: number | null
          risk_regime?: string | null
          snapshot_ts: string
          vix?: number | null
        }
        Update: {
          dxy?: number | null
          move?: number | null
          risk_regime?: string | null
          snapshot_ts?: string
          vix?: number | null
        }
        Relationships: []
      }
      news_sentiment: {
        Row: {
          category: string | null
          created_at: string | null
          date: string
          headline: string
          id: string
          published_at: string | null
          sentiment_score: number | null
          source: string | null
          summary: string | null
          symbol: string
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          date?: string
          headline: string
          id?: string
          published_at?: string | null
          sentiment_score?: number | null
          source?: string | null
          summary?: string | null
          symbol: string
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          date?: string
          headline?: string
          id?: string
          published_at?: string | null
          sentiment_score?: number | null
          source?: string | null
          summary?: string | null
          symbol?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_sentiment_symbol_fkey"
            columns: ["symbol"]
            isOneToOne: false
            referencedRelation: "symbols"
            referencedColumns: ["symbol"]
          },
        ]
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
          date: string
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
        Relationships: []
      }
      pattern_signal: {
        Row: {
          confidence: number
          id: string
          pattern: string
          scan_date: string
          symbol: string
        }
        Insert: {
          confidence: number
          id?: string
          pattern: string
          scan_date: string
          symbol: string
        }
        Update: {
          confidence?: number
          id?: string
          pattern?: string
          scan_date?: string
          symbol?: string
        }
        Relationships: []
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
        Relationships: []
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
      uoa_events: {
        Row: {
          contracts: number
          created_at: string | null
          event_ts: string
          expiry: string
          id: string
          option_price: number | null
          strike: number
          symbol: string
          traded_iv: number | null
          type: string
        }
        Insert: {
          contracts: number
          created_at?: string | null
          event_ts: string
          expiry: string
          id?: string
          option_price?: number | null
          strike: number
          symbol: string
          traded_iv?: number | null
          type: string
        }
        Update: {
          contracts?: number
          created_at?: string | null
          event_ts?: string
          expiry?: string
          id?: string
          option_price?: number | null
          strike?: number
          symbol?: string
          traded_iv?: number | null
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      list_symbols_with_history: {
        Args: Record<PropertyKey, never>
        Returns: {
          symbol: string
        }[]
      }
      seed_stub_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
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
