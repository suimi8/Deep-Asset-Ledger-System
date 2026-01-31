import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.jsx'
import axios from 'axios'

// 开发环境使用 Vite 代理，生产环境使用相对路径（自动指向当前域名）
// 不要硬编码 localhost，否则生产环境会请求错误的地址
if (import.meta.env.DEV) {
  // 开发模式：使用本地后端
  axios.defaults.baseURL = 'http://127.0.0.1:8000';
} else {
  // 生产模式：使用相对路径，由同一服务器提供 API
  axios.defaults.baseURL = '';
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
