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
    config_key = session.exec(select(SystemConfig).where(SystemConfig.key == "EXTERNAL_API_KEY")).first()
    master_key = config_key.value if config_key else os.getenv("EXTERNAL_API_KEY")
    
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

@router.post("/config/api-settings")
async def set_api_settings(
    data: dict, 
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """
    从 UI 设置全局 API 地址和密钥
    """
    settings = {
        "EXTERNAL_API_KEY": data.get("apiKey"),
        "EXTERNAL_API_URL": data.get("apiUrl")
    }
    
    for key, value in settings.items():
        if value is not None:
            config = session.exec(select(SystemConfig).where(SystemConfig.key == key)).first()
            if config:
                config.value = value
                config.updated_at = datetime.utcnow()
            else:
                config = SystemConfig(key=key, value=value)
            session.add(config)
            
    session.commit()
    return {"message": "API Settings updated successfully"}

@router.get("/config/api-settings")
async def get_api_settings(
    current_user: User = Depends(get_current_user), 
    session: Session = Depends(get_session)
):
    """
    获取当前 API 配置状态（出于安全原因内容可能部分隐藏）
    """
    config_key = session.exec(select(SystemConfig).where(SystemConfig.key == "EXTERNAL_API_KEY")).first()
    config_url = session.exec(select(SystemConfig).where(SystemConfig.key == "EXTERNAL_API_URL")).first()
    
    return {
        "isConfigured": config_key is not None or os.getenv("EXTERNAL_API_KEY") is not None,
        "apiUrl": config_url.value if config_url else os.getenv("EXTERNAL_API_URL", ""),
        "hasKey": config_key is not None
    }
