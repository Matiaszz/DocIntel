# DocIntel - Frontend

Este é o módulo frontend do projeto **DocIntel**, desenvolvido com [Next.js](https://nextjs.org), React e TypeScript.

---

## 🚀 Como Rodar o Frontend

### 1 | Instalar Dependências
Navegue até a pasta `frontend` e instale os pacotes necessários:

```bash
cd frontend
npm i
```

### 2 | Executar o Servidor de Desenvolvimento
Inicie a aplicação em modo de desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador para visualizar a aplicação.

---

## ⚙️ Configuração de Variáveis de Ambiente (`.env`)

Caso você queira definir uma URL diferente para a comunicação com a API backend:

1. Crie um arquivo `.env` na raiz do diretório `frontend`.
2. Defina a variável `NEXT_PUBLIC_API_URL`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 🛠️ Scripts Disponíveis

No diretório `frontend`, você pode executar:

- `npm run dev` - Executa a aplicação em modo de desenvolvimento
- `npm run build` - Compila a aplicação para produção
- `npm run start` - Inicia o servidor de produção compilado
- `npm run lint` - Executa a verificação do linter (ESLint)
