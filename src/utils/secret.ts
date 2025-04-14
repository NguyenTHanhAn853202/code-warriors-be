import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT 
const URL_DATABASE = process.env.URL_DATABASE ?? ""
const URL_JUDGE0 = process.env.URL_JUDGE0 ?? ""
const TOKEN_KEY = process.env.TOKEN_KEY ?? ""
const EMAIL_USER = process.env.EMAIL_USER ?? ""
const EMAIL_PASS =process.env.EMAIL_PASS ?? ""

export {PORT,URL_DATABASE, URL_JUDGE0,TOKEN_KEY,EMAIL_USER,EMAIL_PASS}