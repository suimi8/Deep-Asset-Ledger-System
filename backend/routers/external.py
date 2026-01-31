from fastapi import APIRouter, Header, HTTPException, Depends
from typing import Optional
import os
from sqlmodel import Session, select
from database import get_session
from models import SystemConfig, User
from services.market_data import fetch_diagnosis_data
from services.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/external", tags=["external"])

@router.get("/diagnosis/{symbol}")
async def get_stock_diagnosis(
    symbol: str, 
    x_api_key: Optional[str] = Header(None, alias="X-API-KEY"),
    session: Session = Depends(get_session)
):
    """
    提供外部调用的股票解析/诊断服务
    """
    # 按照优先级检查密钥: 1. 数据库 2. 环境变量
    config = session.exec(select(SystemConfig).where(SystemConfig.key == "EXTERNAL_API_KEY")).first()
    master_key = config.value if config else os.getenv("EXTERNAL_API_KEY")
    
    if not master_key:
        raise HTTPException(
            status_code=500,
            detail="External API key is not configured in DB or Environment. Please set it in Settings."
        )

    if not x_api_key or x_api_key != master_key:
        raise HTTPException(
            status_code=401, 
            detail="无效的 API 密钥，请联系作者: https://t.me/suimigg666"
        )
    
    try:
        data = fetch_diagnosis_data(symbol)
        if not data:
            raise HTTPException(status_code=404, detail="Stock not found")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/config/api-key")
async def set_api_key(
    data: dict, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """
    从 UI 设置全局 API 密钥 (需要登录)
    """
    new_key = data.get("apiKey")
    if not new_key:
        raise HTTPException(status_code=400, detail="Key cannot be empty")
        
    config = session.exec(select(SystemConfig).where(SystemConfig.key == "EXTERNAL_API_KEY")).first()
    if config:
        config.value = new_key
        config.updated_at = datetime.utcnow()
    else:
        config = SystemConfig(key="EXTERNAL_API_KEY", value=new_key)
        
    session.add(config)
    session.commit()
    return {"message": "API Key updated successfully"}

@router.get("/config/api-key")
async def get_api_key_status(
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """
    检查 API 密钥是否已配置
    """
    config = session.exec(select(SystemConfig).where(SystemConfig.key == "EXTERNAL_API_KEY")).first()
    return {"isConfigured": config is not None or os.getenv("EXTERNAL_API_KEY") is not None}
