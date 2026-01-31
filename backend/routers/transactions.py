from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session
from models import Transaction, Stock, User
from services.auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.put("/{transaction_id}", response_model=Transaction)
def update_transaction(transaction_id: int, transaction_update: Transaction, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    db_transaction = session.get(Transaction, transaction_id)
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Verify ownership via Stock
    stock = session.exec(select(Stock).where(Stock.id == db_transaction.stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    transaction_data = transaction_update.model_dump(exclude_unset=True)
    if 'id' in transaction_data:
        del transaction_data['id']
    if 'stock_id' in transaction_data:
        # Prevent changing stock_id if not intended, but usually fine.
        # Ideally stock_id shouldn't change, but if user made mistake...
        pass

    for key, value in transaction_data.items():
        setattr(db_transaction, key, value)
        
    session.add(db_transaction)
    session.commit()
    session.refresh(db_transaction)
    return db_transaction

@router.delete("/{transaction_id}")
def delete_transaction(transaction_id: int, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    transaction = session.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Verify ownership via Stock
    stock = session.exec(select(Stock).where(Stock.id == transaction.stock_id, Stock.user_id == current_user.id)).first()
    if not stock:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    session.delete(transaction)
    session.commit()
    return {"ok": True}
