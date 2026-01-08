document.addEventListener("DOMContentLoaded", async () => {
  /* =========================
     OVERLAY DE NOME
  ========================= */
  const overlay = document.getElementById("overlayNome");
  const btnSalvar = document.getElementById("salvarNome");
  const inputNome = document.getElementById("nomeUsuario");
  const erroNome = document.getElementById("erroNome");

  if (overlay && btnSalvar && inputNome && erroNome) {
    try {
      const res = await fetch("/api/usuario/status", {
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        if (data.nome_pendente === true) {
          overlay.classList.remove("hidden");
          document.body.style.overflow = "hidden";
        }
      }
    } catch (err) {
      console.error("Erro ao verificar status do usuário:", err);
    }

    btnSalvar.addEventListener("click", async () => {
      const nome = inputNome.value.trim();
      erroNome.textContent = "";

      if (nome.length < 3) {
        erroNome.textContent = "O nome deve ter pelo menos 3 caracteres";
        return;
      }

      if (!/^[A-Za-zÀ-ÿ ]+$/.test(nome)) {
        erroNome.textContent = "Use apenas letras e espaços";
        return;
      }

      const csrfToken = document.cookie
        .split("; ")
        .find(c => c.startsWith("csrf_token="))
        ?.split("=")[1];

      if (!csrfToken) {
        erroNome.textContent = "Erro de segurança. Recarregue a página.";
        return;
      }

      try {
        const res = await fetch("/api/completar-nome", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          credentials: "include",
          body: JSON.stringify({ nome })
        });

        const data = await res.json();

        if (!res.ok) {
          erroNome.textContent = data.erro || "Erro ao salvar nome";
          return;
        }

        overlay.classList.add("hidden");
        document.body.style.overflow = "auto";

      } catch (err) {
        console.error(err);
        erroNome.textContent = "Erro de conexão com o servidor";
      }
    });
  }

  /* =========================
     CRECHES — DADOS DO BD
  ========================= */
  const entreguesEl = document.getElementById("entregues");
  const prometidasEl = document.getElementById("prometidas");
  const percentualEl = document.getElementById("percentual");
  const barraProgresso = document.getElementById("barraProgresso");

  if (!entreguesEl || !prometidasEl || !percentualEl || !barraProgresso) {
    console.warn("Elementos da meta não encontrados");
    return;
  }

  try {
    const res = await fetch("/api/creches", {
      credentials: "include"
    });

    if (!res.ok) throw new Error("Erro ao buscar dados das creches");

    const data = await res.json();

    const entregues = data.entregues;
    const prometidas = data.prometidas;

    entreguesEl.textContent = entregues;
    prometidasEl.textContent = prometidas;

    let percentual = 0;

    if (prometidas > 0) {
      percentual = (entregues / prometidas) * 100;
    }

    percentualEl.textContent = `${percentual.toFixed(2)}%`;
    barraProgresso.style.width = `${percentual}%`;

  } catch (err) {
    console.error("Erro ao carregar dados das creches:", err);
  }
});

/* =========================
   MENU ADMIN
========================= */

const btnAdm = document.querySelector(".btn-adm");
const admMenu = document.getElementById("admMenu");

if (btnAdm && admMenu) {
  btnAdm.addEventListener("click", (e) => {
    e.stopPropagation();
    admMenu.classList.toggle("open");
  });

  // Fecha ao clicar fora
  document.addEventListener("click", () => {
    admMenu.classList.remove("open");
  });

  // Ações do menu
  admMenu.addEventListener("click", (e) => {
    const item = e.target.closest("li");
    if (!item || item.classList.contains("divider")) return;

    const action = item.dataset.action;

    switch (action) {
      case "info":
        window.location.href = "/informacoes";
        break;

      case "creches":
        window.location.href = "/creche";
        break;

      case "logout":
        window.location.href = "/logout";
        break;
    }

    admMenu.classList.remove("open");
  });
}
