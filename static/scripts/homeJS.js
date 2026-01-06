document.addEventListener("DOMContentLoaded", async () => {
  const overlay = document.getElementById("overlayNome");
  const btnSalvar = document.getElementById("salvarNome");
  const inputNome = document.getElementById("nomeUsuario");
  const erroNome = document.getElementById("erroNome");

  if (!overlay || !btnSalvar || !inputNome || !erroNome) return;

  // 1️⃣ Verifica se usuário precisa completar o nome
  try {
    const res = await fetch("/api/usuario/status", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data.nome_pendente) {
        overlay.classList.remove("hidden");
        document.body.style.overflow = "hidden"; // trava rolagem
      }
    }
  } catch (e) {
    console.error("Erro ao verificar status do usuário:", e);
  }

  // 2️⃣ Evento de salvar nome
  btnSalvar.addEventListener("click", async () => {
    const nome = inputNome.value.trim();
    erroNome.textContent = "";

    if (nome.length < 3) {
      erroNome.textContent = "Nome muito curto";
      return;
    }
    if (!/^[A-Za-zÀ-ÿ ]+$/.test(nome)) {
      erroNome.textContent = "Nome inválido (não pode conter números ou símbolos)";
      return;
    }

    const csrfToken = document.cookie
      .split("; ")
      .find(c => c.startsWith("csrf_token="))
      ?.split("=")[1];

    if (!csrfToken) {
      erroNome.textContent = "Erro de segurança (CSRF)";
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

    } catch {
      erroNome.textContent = "Erro de conexão";
    }
  });
});