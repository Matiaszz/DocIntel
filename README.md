# DocIntel

> Plataforma de gerenciamento inteligente de documentos construída com foco em arquitetura escalável, boas práticas de engenharia de software e tecnologias utilizadas no mercado.

## 📖 Sobre o projeto

O **DocIntel** é um projeto pessoal desenvolvido para simular um ambiente de desenvolvimento real de um produto SaaS.

Mais do que implementar funcionalidades, o objetivo é demonstrar conhecimentos em:

- Arquitetura de software
- Desenvolvimento Backend com Spring Boot
- Segurança de aplicações
- Boas práticas de engenharia
- Integração com serviços em nuvem
- Testes automatizados

Cada funcionalidade é adicionada de forma incremental, seguindo uma evolução semelhante à de um produto utilizado em produção.

---

## 🛠️ Como Rodar o Projeto

### Pré-requisitos
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) e Docker Compose
- [Node.js](https://nodejs.org/) (v18+)

---

### 1 | Clonar o Repositório

```bash
git clone https://github.com/Matiaszz/DocIntel.git
cd DocIntel
```

---

### 2 | Backend (Spring Boot + PostgreSQL + Docker)

Navegue até a pasta do backend:
```bash
cd backend
```

1. **Criar o arquivo `.env`**:
   Crie o arquivo `.env` baseado no exemplo fornecido (`.env-example`):
   - **Linux / macOS**:
     ```bash
     cp .env-example .env
     ```
   - **Windows (cmd)**:
     ```cmd
     copy .env-example .env
     ```
   - **Windows (PowerShell)**:
     ```powershell
     Copy-Item .env-example .env
     ```

2. **Iniciar os serviços com Docker**:
   ```bash
   docker compose up
   ```
   *(Adicione `-d` para rodar os containers em segundo plano)*

O servidor backend estará rodando em `http://localhost:8080`.

---

### 3 | Frontend (Next.js / React)

Navegue até a pasta do frontend (a partir da raiz do projeto):
```bash
cd frontend
```

1. **Instalar as dependências**:
   ```bash
   npm i
   ```

2. **Executar o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

O frontend estará disponível em `http://localhost:3000`.

#### 💡 Configurar URL da API (Opcional)
Se quiser definir um link/endereço diferente para a API backend, crie um arquivo `.env` na raiz da pasta `frontend` contendo:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 🚀 Tecnologias

### Backend
- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- PostgreSQL
- Flyway
- JWT
- Maven

### Frontend
- Next.js / React
- TypeScript

### Ferramentas
- Docker
- Swagger / OpenAPI
- Git / GitHub

### Cloud
- AWS S3
- AWS SES

---

## 📅 Roadmap

O projeto é desenvolvido em etapas, simulando sprints de um ambiente profissional.

➡️ **Veja o roadmap completo:** [`docs/roadmap.md`](./docs/roadmap.md)

---

## 🎯 Objetivo

Este projeto tem como finalidade consolidar conhecimentos em desenvolvimento e arquitetura backend, aprender um pouco sobre AWS e Cloud e servir como portfólio, aplicando conceitos encontrados em sistemas utilizados em ambiente corporativo.

---

## 📚 Referências

- System Design do Google Drive: https://www.youtube.com/watch?v=qMPfjCH3qQU&t=1681s

---

## 📄 Licença

Este projeto está disponível apenas para fins de estudo e demonstração de portfólio.
