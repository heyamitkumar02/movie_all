import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

IS_VERCEL = bool(os.getenv("VERCEL"))
DEFAULT_DB = "sqlite:////tmp/boxoffice.db" if IS_VERCEL else "sqlite:///./boxoffice.db"
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL") or DEFAULT_DB

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
