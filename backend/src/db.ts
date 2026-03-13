import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in .env')
}

export const pool = new Pool({
  connectionString,
})

export const dbQuery = async <T = any>(text: string, params: any[] = []) => {
  const result = await pool.query<T>(text, params)
  return result
}