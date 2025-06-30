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
      market_volatility: {
        Row: {
          dividend_date: string | null
          earnings_announcement: string | null
          historical_volatility_30d: number | null
          id: string
          implied_volatility_30d: number | null
          iv_percentile: number | null
          iv_rank: number | null
          skew: number | null
          symbol: string
          term_structure: Json | null
          updated_at: string | null
          vix_correlation: number | null
        }
        Insert: {
          dividend_date?: string | null
          earnings_announcement?: string | null
          historical_volatility_30d?: number | null
          id?: string
          implied_volatility_30d?: number | null
          iv_percentile?: number | null
          iv_rank?: number | null
          skew?: number | null
          symbol: string
          term_structure?: Json | null
          updated_at?: string | null
          vix_correlation?: number | null
        }
        Update: {
          dividend_date?: string | null
          earnings_announcement?: string | null
          historical_volatility_30d?: number | null
          id?: string
          implied_volatility_30d?: number | null
          iv_percentile?: number | null
          iv_rank?: number | null
          skew?: number | null
          symbol?: string
          term_structure?: Json | null
          updated_at?: string | null
          vix_correlation?: number | null
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
      options_chain: {
        Row: {
          ask: number | null
          bid: number | null
          data_timestamp: string | null
          delta: number | null
          expiration_date: string
          gamma: number | null
          id: string
          implied_volatility: number | null
          intrinsic_value: number | null
          last_trade_price: number | null
          last_trade_time: string | null
          open_interest: number | null
          option_type: string
          rho: number | null
          strike_price: number
          symbol: string
          theoretical_price: number | null
          theta: number | null
          time_value: number | null
          vega: number | null
          volume: number | null
        }
        Insert: {
          ask?: number | null
          bid?: number | null
          data_timestamp?: string | null
          delta?: number | null
          expiration_date: string
          gamma?: number | null
          id?: string
          implied_volatility?: number | null
          intrinsic_value?: number | null
          last_trade_price?: number | null
          last_trade_time?: string | null
          open_interest?: number | null
          option_type: string
          rho?: number | null
          strike_price: number
          symbol: string
          theoretical_price?: number | null
          theta?: number | null
          time_value?: number | null
          vega?: number | null
          volume?: number | null
        }
        Update: {
          ask?: number | null
          bid?: number | null
          data_timestamp?: string | null
          delta?: number | null
          expiration_date?: string
          gamma?: number | null
          id?: string
          implied_volatility?: number | null
          intrinsic_value?: number | null
          last_trade_price?: number | null
          last_trade_time?: string | null
          open_interest?: number | null
          option_type?: string
          rho?: number | null
          strike_price?: number
          symbol?: string
          theoretical_price?: number | null
          theta?: number | null
          time_value?: number | null
          vega?: number | null
          volume?: number | null
        }
        Relationships: []
      }
      options_strategies: {
        Row: {
          breakeven_points: number[] | null
          confidence_score: number | null
          created_at: string | null
          days_to_expiration: number | null
          delta_exposure: number | null
          expected_return: number | null
          id: string
          iv_rank: number | null
          legs: Json
          max_loss: number | null
          max_profit: number | null
          profit_probability: number | null
          risk_reward_ratio: number | null
          strategy_name: string
          strategy_type: string
          symbol: string
          theta_decay: number | null
        }
        Insert: {
          breakeven_points?: number[] | null
          confidence_score?: number | null
          created_at?: string | null
          days_to_expiration?: number | null
          delta_exposure?: number | null
          expected_return?: number | null
          id?: string
          iv_rank?: number | null
          legs: Json
          max_loss?: number | null
          max_profit?: number | null
          profit_probability?: number | null
          risk_reward_ratio?: number | null
          strategy_name: string
          strategy_type: string
          symbol: string
          theta_decay?: number | null
        }
        Update: {
          breakeven_points?: number[] | null
          confidence_score?: number | null
          created_at?: string | null
          days_to_expiration?: number | null
          delta_exposure?: number | null
          expected_return?: number | null
          id?: string
          iv_rank?: number | null
          legs?: Json
          max_loss?: number | null
          max_profit?: number | null
          profit_probability?: number | null
          risk_reward_ratio?: number | null
          strategy_name?: string
          strategy_type?: string
          symbol?: string
          theta_decay?: number | null
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
      tradeable_symbols: {
        Row: {
          avg_volume: number | null
          company_name: string | null
          exchange: string | null
          last_updated: string | null
          market_cap: number | null
          options_available: boolean | null
          sector: string | null
          symbol: string
        }
        Insert: {
          avg_volume?: number | null
          company_name?: string | null
          exchange?: string | null
          last_updated?: string | null
          market_cap?: number | null
          options_available?: boolean | null
          sector?: string | null
          symbol: string
        }
        Update: {
          avg_volume?: number | null
          company_name?: string | null
          exchange?: string | null
          last_updated?: string | null
          market_cap?: number | null
          options_available?: boolean | null
          sector?: string | null
          symbol?: string
        }
        Relationships: []
      }
      unusual_options_activity: {
        Row: {
          avg_volume: number | null
          detected_at: string | null
          expiration_date: string
          id: string
          option_type: string
          premium_paid: number | null
          sentiment: string | null
          strike_price: number
          symbol: string
          underlying_price: number | null
          unusual_score: number | null
          volume: number
          volume_ratio: number | null
        }
        Insert: {
          avg_volume?: number | null
          detected_at?: string | null
          expiration_date: string
          id?: string
          option_type: string
          premium_paid?: number | null
          sentiment?: string | null
          strike_price: number
          symbol: string
          underlying_price?: number | null
          unusual_score?: number | null
          volume: number
          volume_ratio?: number | null
        }
        Update: {
          avg_volume?: number | null
          detected_at?: string | null
          expiration_date?: string
          id?: string
          option_type?: string
          premium_paid?: number | null
          sentiment?: string | null
          strike_price?: number
          symbol?: string
          underlying_price?: number | null
          unusual_score?: number | null
          volume?: number
          volume_ratio?: number | null
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
