# Deep Asset Ledger System (深度资产账本系统)

[🇺🇸 English](./README_EN.md) | [🇨🇳 繁體中文](./README_TW.md)

专注于独立股票时间轴追踪与高级成本基数计算的专业资产管理系统。

## ✨ 核心特性
- **独立时间轴**: 单独追踪每只股票的历史记录与交易脉络。
- **FIFO 成本计算**: 使用先进先出（FIFO）逻辑实时计算已实现盈亏，精准税务核算。
- **可视化仪表盘**: 交互式图表与摘要统计，资产状况一目了然。
- **现代技术栈**: 采用 React 19 (Vite) + FastAPI + Tailwind CSS 构建。
- **安全优先**: 动态 Token 签名验证与 RSA 加密通信。

## 🛠️ 项目结构
```text
/backend         # FastAPI Python 后端
  /routers       # API 路由端点
  /services      # 金融逻辑 (FIFO 核心算法等)
  models.py      # 数据库模型定义
  main.py        # 程序入口
  .env.example   # 环境变量示例
/frontend        # React 前端
  /src/pages     # 页面组件 (仪表盘, 股票列表等)
  /src/components # UI 组件库
```

## 🚀 快速开始

### 环境要求
- Python 3.9+
- Node.js 16+

### 1. 启动后端 (Backend)
```bash
cd backend
# 1. 创建虚拟环境 (推荐)
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# (可选) 修改 .env 中的配置

# 4. 启动服务
uvicorn main:app --reload
# 服务运行于 http://localhost:8000
# API 文档: http://localhost:8000/docs
```

### 2. 启动前端 (Frontend)
```bash
cd frontend
npm install
npm run dev
# 应用运行于 http://localhost:5173
```

## 📖 使用说明
1. 打开浏览器访问前端地址 (默认 http://localhost:5173)。
2. 注册并登录账户。
3. 进入 "股票 (Stocks)" 页面添加新的关注标的 (如 AAPL)。
4. 记录买入/卖出交易，系统将自动计算 FIFO 成本与盈亏。

## 🔐 部署配置 (Zeabur / Docker)
项目已对云原生环境进行优化。
- **环境变量**: 生产环境请务必设置 `TOKEN_SECRET` 和 `ALLOWED_ORIGINS`。
- **持久化**: 确保数据库文件 (`ledger.db`) 所在的目录挂载了持久化存储。
