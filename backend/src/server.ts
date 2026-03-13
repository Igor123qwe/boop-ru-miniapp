import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import { pool } from './db.js'
import citiesRouter from './routes/cities.js'
import placesRouter from './routes/places.js'
import routesRouter from './routes/routes.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 8787)
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
)

app.use(express.json({ limit: '10mb' }))

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (error) {
    console.error('/health error', error)
    res.status(500).json({ ok: false })
  }
})

app.use('/api/cities', citiesRouter)
app.use('/api/places', placesRouter)
app.use('/api/routes', routesRouter)

app.listen(port, () => {
  console.log(`Backend started on http://localhost:${port}`)
})