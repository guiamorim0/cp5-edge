"""Configuracoes da aplicacao, carregadas do arquivo .env."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Le as variaveis de ambiente e monta as URLs dos servicos do FIWARE."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    fiware_host: str
    orion_port: int = 1026
    iotagent_port: int = 4041
    sth_port: int = 8666

    fiware_service: str = "smart"
    fiware_servicepath: str = "/"

    api_port: int = 8000

    # Banco de dados. SQLite por padrao: um arquivo ao lado da aplicacao.
    database_url: str = "sqlite:///./vinheria.db"

    @property
    def orion_url(self) -> str:
        return f"http://{self.fiware_host}:{self.orion_port}"

    @property
    def iotagent_url(self) -> str:
        return f"http://{self.fiware_host}:{self.iotagent_port}"

    @property
    def sth_url(self) -> str:
        return f"http://{self.fiware_host}:{self.sth_port}"

    @property
    def headers(self) -> dict:
        """Headers exigidos em toda requisicao ao FIWARE."""
        return {
            "fiware-service": self.fiware_service,
            "fiware-servicepath": self.fiware_servicepath,
        }

    @property
    def headers_json(self) -> dict:
        """Headers para requisicoes com corpo.

        O Orion recusa Content-Type em GET e DELETE, respondendo BadRequest,
        entao o header so acompanha as chamadas que realmente enviam dados.
        """
        return {**self.headers, "Content-Type": "application/json"}


settings = Settings()
