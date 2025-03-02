import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT 
const URL_DATABASE = process.env.URL_DATABASE ?? ""

export {PORT,URL_DATABASE}