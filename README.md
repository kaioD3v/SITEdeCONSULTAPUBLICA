# Monitor de Metas Públicas (em desenvolvimento)

O **Monitor de Metas Públicas** é um projeto web que permite acompanhar o progresso de metas anunciadas, como a construção de creches. Ele possui duas páginas principais:

1. **Página de Login (index.html)**  
   - Solicita que o usuário informe CPF, telefone e nome.  
   - Realiza validações básicas de CPF e telefone.  
   - Redireciona o usuário para a página principal (home) após o login.

2. **Página Home (home.html)**  
   - Mostra o número de creches prometidas e entregues.  
   - Calcula e exibe dinamicamente o percentual de conclusão.  
   - A barra de progresso se ajusta conforme o percentual.  
   - Números de entregues aparecem em destaque (vermelho) e prometidas em verde.  

O projeto é desenvolvido usando **HTML, CSS, JavaScript** no frontend e **Python com Flask** no backend.  

A ideia é que o **frontend seja seguro para o usuário comum**, enquanto dados sensíveis ou a atualização de metas possa ser feita em um painel administrativo separado, que não é exposto ao público.
