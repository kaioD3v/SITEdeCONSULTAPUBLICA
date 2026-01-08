document.addEventListener("DOMContentLoaded", async () => {

  /* =========================
     GRID — INFORMAÇÕES
  ========================= */
  const grid = document.getElementById("usersGrid");

  const modalDelete = document.getElementById("modalDelete");
  const cancelDelete = document.getElementById("cancelDelete");
  const confirmDelete = document.getElementById("confirmDelete");

  let usuarioParaExcluir = null;
  let usuariosCache = []; // 🔥 cache para exportação

  if (!grid) return;

  try {
    const res = await fetch("/api/informacoes/listar", {
      credentials: "include"
    });

    if (!res.ok) throw new Error("Erro ao buscar informações");

    const usuarios = await res.json();
    usuariosCache = usuarios; // 🔥 salva dados
    grid.innerHTML = "";

    if (usuarios.length === 0) {
      grid.innerHTML = "<p>Nenhum usuário encontrado</p>";
      return;
    }

    usuarios.forEach(u => {
      const card = document.createElement("div");
      card.className = `user-card ${u.admin ? "is-admin" : ""}`;
      card.dataset.id = u.id;
      card.dataset.admin = String(u.admin);

      const iniciais = (u.nome || "SN")
        .split(" ")
        .map(n => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

      card.innerHTML = `
        <div class="user-header">
          <div class="avatar">${iniciais}</div>
          <div class="user-name">${u.nome || "Sem Nome"}</div>
          ${u.admin ? `<span class="badge-admin">ADMIN</span>` : ""}
        </div>

        <div class="user-info">
          <div>
            <i class="fas fa-id-card"></i>
            <span>${mascararCPF(u.cpf)}</span>
          </div>
          <div>
            <i class="fas fa-phone"></i>
            <span>${mascararTelefone(u.telefone)}</span>
          </div>
        </div>

        <div class="user-actions">
          <button
            class="btn-admin-toggle ${u.admin ? "is-admin" : ""}"
            data-admin="${u.admin}"
            title="${u.admin ? "Remover administrador" : "Tornar administrador"}"
          >
            <i class="fas ${u.admin ? "fa-user-shield" : "fa-user-plus"}"></i>
          </button>

          <button class="btn-delete" title="Excluir usuário">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>Erro ao carregar usuários</p>";
  }

  /* =========================
     CLICK GLOBAL
  ========================= */
  document.addEventListener("click", async (e) => {

    /* ===== EXCLUIR ===== */
    const btnDelete = e.target.closest(".btn-delete");
    if (btnDelete) {
      const card = btnDelete.closest(".user-card");
      if (!card) return;

      usuarioParaExcluir = card.dataset.id;
      modalDelete.classList.remove("hidden");
      document.body.style.overflow = "hidden";
      return;
    }

    /* ===== ADMIN ===== */
    const btnAdmin = e.target.closest(".btn-admin-toggle");
    if (btnAdmin) {
      const card = btnAdmin.closest(".user-card");
      if (!card) return;

      const userId = card.dataset.id;
      const isAdmin = card.dataset.admin === "true";

      const csrfToken = document.cookie
        .split("; ")
        .find(c => c.startsWith("csrf_token="))
        ?.split("=")[1];

      if (!csrfToken) {
        mostrarAlerta("Erro de segurança. Recarregue a página.");
        return;
      }

      try {
        const res = await fetch(`/api/informacoes/${userId}/admin`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken
          },
          credentials: "include",
          body: JSON.stringify({ admin: !isAdmin })
        });

        const data = await res.json();
        if (!res.ok) {
          mostrarAlerta(data.erro || "Erro ao atualizar administrador");
          return;
        }

        card.dataset.admin = String(data.admin);
        card.classList.toggle("is-admin", data.admin);
        btnAdmin.classList.toggle("is-admin", data.admin);

        const icon = btnAdmin.querySelector("i");
        let badge = card.querySelector(".badge-admin");

        if (data.admin) {
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "badge-admin";
            badge.textContent = "ADMIN";
            card.querySelector(".user-header").appendChild(badge);
          }
          icon.className = "fas fa-user-shield";
          mostrarAlerta("Usuário promovido a administrador.");
        } else {
          badge?.remove();
          icon.className = "fas fa-user-plus";
          mostrarAlerta("Administrador removido.");
        }

      } catch (err) {
        console.error(err);
        mostrarAlerta("Erro de conexão");
      }
    }
  });

  /* =========================
     MODAL DELETE
  ========================= */
  cancelDelete?.addEventListener("click", () => {
    usuarioParaExcluir = null;
    modalDelete.classList.add("hidden");
    document.body.style.overflow = "auto";
  });

  confirmDelete?.addEventListener("click", async () => {
    if (!usuarioParaExcluir) return;

    const csrfToken = document.cookie
      .split("; ")
      .find(c => c.startsWith("csrf_token="))
      ?.split("=")[1];

    try {
      const res = await fetch(`/api/informacoes/${usuarioParaExcluir}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": csrfToken },
        credentials: "include"
      });

      if (!res.ok) throw new Error();

      document
        .querySelector(`.user-card[data-id="${usuarioParaExcluir}"]`)
        ?.remove();

      mostrarAlerta("Usuário excluído.");

    } catch {
      mostrarAlerta("Erro ao excluir");
    } finally {
      modalDelete.classList.add("hidden");
      document.body.style.overflow = "auto";
      usuarioParaExcluir = null;
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

    admMenu.addEventListener("click", (e) => {
      const item = e.target.closest("li");
      if (!item) return;

      const action = item.dataset.action;

      switch (action) {
        case "home":
          window.location.href = "/admin";
          break;
        case "creches":
          window.location.href = "/creche";
          break;
        case "logout":
          window.location.href = "/logout";
          break;

        case "export": // 🔥 EXPORTAÇÃO XLSX
          exportarXLSX();
          break;
      }

      admMenu.classList.remove("open");
    });

    document.addEventListener("click", () => {
      admMenu.classList.remove("open");
    });
  }

  /* =========================
     EXPORTAÇÃO XLSX
  ========================= */
  function exportarXLSX() {
    if (!usuariosCache.length) {
      mostrarAlerta("Nenhum dado para exportar");
      return;
    }

    const dados = usuariosCache.map(u => ({
      Nome: u.nome || "",
      CPF: u.cpf || "",
      Telefone: u.telefone || ""
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Usuários");
    XLSX.writeFile(wb, "usuarios.xlsx");

    mostrarAlerta("Arquivo XLSX gerado com sucesso.");
  }

});

/* =========================
   ALERTA
========================= */
function mostrarAlerta(msg) {
  const alert = document.getElementById("alertTop");
  if (!alert) return;

  alert.textContent = msg;
  alert.classList.remove("hidden");

  setTimeout(() => {
    alert.classList.add("hidden");
  }, 4000);
}

/* =========================
   MÁSCARAS
========================= */
function mascararCPF(cpf) {
  if (!cpf) return "—";
  cpf = cpf.replace(/\D/g, "").padStart(11, "0");
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function mascararTelefone(tel) {
  if (!tel) return "—";
  tel = tel.replace(/\D/g, "");

  if (tel.length === 11)
    return tel.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");

  if (tel.length === 10)
    return tel.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");

  return tel;
}
