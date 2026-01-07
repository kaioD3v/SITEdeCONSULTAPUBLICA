from flask import (
    Flask, render_template, request, jsonify,
    redirect, make_response
)
from dotenv import load_dotenv
import os
import secrets
import re
from sqlalchemy.exc import IntegrityError

from database import db, get_database_uri
from models import Informacoes, Creche, gerar_hash

# =========================
# LOAD ENV
# =========================

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY não definida")

# =========================
# APP
# =========================

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

# =========================
# CONFIG
# =========================

app.config["SQLALCHEMY_DATABASE_URI"] = get_database_uri()
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = SECRET_KEY
db.init_app(app)

# =========================
# CSRF TOKEN
# =========================

def gerar_csrf_token():
    return secrets.token_hex(16)

def validar_csrf():
    token_cookie = request.cookies.get("csrf_token")
    token_header = request.headers.get("X-CSRF-Token")
    return token_cookie and token_header and token_cookie == token_header

@app.after_request
def set_csrf_cookie(response):
    if not request.cookies.get("csrf_token"):
        response.set_cookie(
            "csrf_token",
            gerar_csrf_token(),
            samesite="Lax"
        )
    return response

# =========================
# ROTAS
# =========================

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/home")
def home():
    if request.cookies.get("auth") != "1":
        return redirect("/")
    return render_template("home.html")

@app.route("/admin")
def admin():
    if request.cookies.get("auth") != "1":
        return redirect("/")
    if request.cookies.get("admin") != "1":
        return redirect("/home")
    return render_template("admin.html")

# =========================
# API - SESSION
# =========================

@app.route("/api/session", methods=["GET"])
def verificar_sessao():
    if request.cookies.get("auth") != "1":
        return jsonify({"logado": False}), 401

    return jsonify({
        "logado": True,
        "admin": request.cookies.get("admin") == "1"
    }), 200

# =========================
# API - INFORMACOES (LOGIN / CADASTRO)
# =========================

@app.route("/api/informacoes", methods=["POST"])
def criar_informacoes():
    if not validar_csrf():
        return jsonify({"erro": "CSRF inválido"}), 403

    try:
        data = request.get_json()
        cpf = data.get("cpf")
        telefone = data.get("telefone")
        nome = data.get("nome", "Sem Nome")  # nome provisório

        if not cpf or not telefone:
            return jsonify({"erro": "Dados inválidos"}), 400

        cpf_hash = gerar_hash(cpf)
        telefone_hash = gerar_hash(telefone)

        registro_cpf = Informacoes.query.filter_by(cpf_hash=cpf_hash).first()
        registro_tel = Informacoes.query.filter_by(telefone_hash=telefone_hash).first()

        # 1️⃣ LOGIN NORMAL
        if registro_cpf and registro_tel:
            if registro_cpf.id != registro_tel.id:
                return jsonify({"erro": "CPF e telefone não correspondem"}), 403

            response = make_response(jsonify({
                "sucesso": True,
                "admin": registro_cpf.admin
            }))
            response.set_cookie("auth", "1", httponly=True, samesite="Lax")
            response.set_cookie(
                "admin",
                "1" if registro_cpf.admin else "0",
                httponly=True,
                samesite="Lax"
            )
            response.set_cookie(
                "user_id",
                str(registro_cpf.id),
                httponly=True,
                samesite="Lax"
            )
            return response, 200

        # 2️⃣ CASO DE INCONSISTÊNCIA
        if registro_cpf and not registro_tel:
            return jsonify({"erro": "Telefone incorreto para este CPF"}), 403
        if registro_tel and not registro_cpf:
            return jsonify({"erro": "CPF incorreto para este telefone"}), 403

        # 3️⃣ CADASTRO DE NOVO USUÁRIO
        info = Informacoes()
        info.set_nome(nome)  # "Sem Nome" provisório
        info.set_cpf(cpf)
        info.set_telefone(telefone)

        db.session.add(info)
        db.session.commit()

        response = make_response(jsonify({
            "sucesso": True,
            "admin": False
        }))
        response.set_cookie("auth", "1", httponly=True, samesite="Lax")
        response.set_cookie("admin", "0", httponly=True, samesite="Lax")
        response.set_cookie("user_id", str(info.id), httponly=True, samesite="Lax")

        return response, 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"erro": "CPF ou telefone já cadastrado"}), 400
    except Exception as e:
        print("ERRO:", e)
        db.session.rollback()
        return jsonify({"erro": "Erro interno"}), 500

# =========================
# API - STATUS USUARIO
# =========================

@app.route("/api/usuario/status", methods=["GET"])
def status_usuario():
    if request.cookies.get("auth") != "1":
        return jsonify({"logado": False}), 401

    user_id = request.cookies.get("user_id")
    if not user_id:
        return jsonify({"nome_pendente": True}), 200

    info = Informacoes.query.filter_by(id=int(user_id)).first()
    if not info:
        return jsonify({"nome_pendente": True}), 200

    # considera "Sem Nome" como pendente
    nome_pendente = not info.nome_criptografado or info.get_nome() == "Sem Nome"

    return jsonify({"nome_pendente": nome_pendente}), 200

# =========================
# API - COMPLETAR NOME
# =========================

@app.route("/api/completar-nome", methods=["POST"])
def completar_nome():
    if not validar_csrf():
        return jsonify({"erro": "CSRF inválido"}), 403

    if request.cookies.get("auth") != "1":
        return jsonify({"erro": "Não autorizado"}), 401

    user_id = request.cookies.get("user_id")
    if not user_id:
        return jsonify({"erro": "Usuário inválido"}), 400

    data = request.get_json()
    nome = data.get("nome", "").strip()

    if len(nome) < 3:
        return jsonify({"erro": "Nome muito curto"}), 400
    if not re.match(r"^[A-Za-zÀ-ÿ ]+$", nome):
        return jsonify({"erro": "Nome inválido"}), 400

    info = Informacoes.query.filter_by(id=int(user_id)).first()
    if not info:
        return jsonify({"erro": "Usuário inválido"}), 400

    info.set_nome(nome)
    db.session.commit()

    return jsonify({"sucesso": True}), 200

# =========================
# API - CRECHES (DADOS PÚBLICOS)
# =========================

@app.route("/api/creches", methods=["GET"])
def dados_creches():
    creche = Creche.query.first()

    if not creche:
        return jsonify({
            "entregues": 0,
            "prometidas": 0
        }), 200

    return jsonify({
        "entregues": creche.total_existentes,
        "prometidas": creche.total_prometidas
    }), 200

# =========================
# API - LOGOUT
# =========================

@app.route("/logout")
def logout():
    response = make_response(redirect("/"))

    # Remove cookies de sessão
    response.delete_cookie("auth")
    response.delete_cookie("admin")
    response.delete_cookie("user_id")

    return response

# =========================
# INIT DB
# =========================

def inicializar_banco():
    with app.app_context():
        db.create_all()
        if not Creche.query.first():
            db.session.add(Creche(total_existentes=0, total_prometidas=0))
            db.session.commit()

# =========================
# START
# =========================

if __name__ == "__main__":
    inicializar_banco()
    app.run(debug=True)