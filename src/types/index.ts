export interface Student {
  id: string
  name: string
  student_code: string
  accounts: {
    checking: number
    savings: number
    investment: number
  }
  total_balance: number
  weekly_allowance: number
}

export interface Transaction {
  id: string
  from_student_id?: string
  to_student_id?: string
  from_entity?: string
  transaction_type: string
  amount: number
  description?: string
  status: string
  created_at: string
  from_account_type?: string
  to_account_type?: string
  from_student_name?: string
  to_student_name?: string
}