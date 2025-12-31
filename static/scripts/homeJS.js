document.addEventListener("DOMContentLoaded", () => {
  const entreguesEl = document.getElementById("entregues");
  const totalEl = document.getElementById("total");
  const percentualEl = document.getElementById("percentual");
  const barraEl = document.getElementById("barraProgresso");

  if (!entreguesEl || !totalEl) return;

  const entregues = parseInt(entreguesEl.textContent);
  const total = parseInt(totalEl.textContent);

  if (isNaN(entregues) || isNaN(total) || total === 0) {
    percentualEl.textContent = "0%";
    barraEl.style.width = "0%";
    return;
  }

  const percentual = ((entregues / total) * 100).toFixed(2);

  percentualEl.textContent = `${percentual}%`;
  barraEl.style.width = `${percentual}%`;

  /* Cor dinâmica da barra */
  if (percentual < 25) {
    barraEl.style.backgroundColor = "#e74c3c"; // vermelho
  } else if (percentual < 60) {
    barraEl.style.backgroundColor = "#f1c40f"; // amarelo
  } else {
    barraEl.style.backgroundColor = "#2ecc71"; // verde
  }
});
