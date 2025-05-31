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
      teachers: {
        Row: {
          id: string
          email: string
          name: string
          school: string | null
          password_hash: string
          session_code: string | null
          plan: string
          student_limit: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          school?: string | null
          password_hash: string
          session_code?: string | null
          plan?: string
          student_limit?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          school?: string | null
          password_hash?: string
          session_code?: string | null
          plan?: string
          student_limit?: number
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: string
          teacher_id: string
          student_code: string
          name: string
          password: string | null
          credit_score: number
          weekly_allowance: number
          last_allowance_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          student_code: string
          name: string
          password?: string | null
          credit_score?: number
          weekly_allowance?: number
          last_allowance_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          student_code?: string
          name?: string
          password?: string | null
          credit_score?: number
          weekly_allowance?: number
          last_allowance_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          student_id: string
          account_type: 'checking' | 'savings' | 'investment'
          balance: number
          interest_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          account_type: 'checking' | 'savings' | 'investment'
          balance?: number
          interest_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          account_type?: 'checking' | 'savings' | 'investment'
          balance?: number
          interest_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      // 추후 추가될 테이블들
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type: 'checking' | 'savings' | 'investment'
      transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'loan_payment' | 'investment' | 'interest' | 'loan' | 'loan_interest'
      asset_type: 'stock' | 'crypto' | 'commodity' | 'real_estate'
    }
  }
}