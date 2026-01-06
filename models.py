import os
from database import db
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import base64
import hashlib  # Para hash de verificação de duplicidade

load_dotenv()

FERNET_KEY = os.getenv("SECRET_KEY")
if not FERNET_KEY:
    raise RuntimeError("SECRET_KEY não definida no .env")

cipher = Fernet(FERNET_KEY.encode())


def gerar_hash(valor):
    """Gera um hash SHA256 para duplicidade"""
    return hashlib.sha256(valor.encode()).hexdigest()


def encrypt(valor: str) -> str:
    """Criptografa e retorna em base64"""
    encrypted = cipher.encrypt(valor.encode())
    return base64.b64encode(encrypted).decode()


def decrypt(valor_base64: str) -> str:
    """Descriptografa valor em base64"""
    if not valor_base64:
        return ""
    encrypted = base64.b64decode(valor_base64.encode())
    return cipher.decrypt(encrypted).decode()


class Informacoes(db.Model):
    __tablename__ = "informacoes"

    id = db.Column(db.Integer, primary_key=True)

    # Campos criptografados
    nome_criptografado = db.Column(db.String(512), nullable=False)
    cpf_criptografado = db.Column(db.String(512), nullable=False)
    telefone_criptografado = db.Column(db.String(512), nullable=False)

    # Campos para verificar duplicidade
    cpf_hash = db.Column(db.String(64), nullable=False, unique=True)
    telefone_hash = db.Column(db.String(64), nullable=False, unique=True)

    # Campo ADMIN
    admin = db.Column(db.Boolean, default=False, nullable=False)

    # =========================
    # Métodos de criptografia
    # =========================
    def set_nome(self, nome):
        self.nome_criptografado = encrypt(nome)

    def get_nome(self):
        return decrypt(self.nome_criptografado)

    def set_cpf(self, cpf):
        self.cpf_criptografado = encrypt(cpf)
        self.cpf_hash = gerar_hash(cpf)

    def get_cpf(self):
        return decrypt(self.cpf_criptografado)

    def set_telefone(self, telefone):
        self.telefone_criptografado = encrypt(telefone)
        self.telefone_hash = gerar_hash(telefone)

    def get_telefone(self):
        return decrypt(self.telefone_criptografado)


class Creche(db.Model):
    __tablename__ = "creche"

    id = db.Column(db.Integer, primary_key=True)
    total_existentes = db.Column(db.Integer, nullable=False)
    total_prometidas = db.Column(db.Integer, nullable=False)
