"""Conexao com o banco de dados.

Usa SQLite: um arquivo unico ao lado da aplicacao, sem servidor para instalar.
Para um sistema de monitoramento com poucos dispositivos isso basta, e o
SQLAlchemy deixa a troca por PostgreSQL ser so uma mudanca de URL.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from app.config import settings

# check_same_thread=False: o FastAPI atende requisicoes em threads diferentes
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Abre uma sessao por requisicao e fecha ao final (dependencia do FastAPI)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def criar_tabelas() -> None:
    """Cria as tabelas que ainda nao existem. Chamado na subida da aplicacao."""
    from app import schema  # noqa: F401  (import garante o registro dos modelos)

    Base.metadata.create_all(bind=engine)
