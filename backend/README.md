# DocIntel - Backend

Este é o módulo backend do projeto **DocIntel**, desenvolvido em Java com Spring Boot.

## 📋 Documentação da API (Swagger / OpenAPI)

Para facilitar a manutenção, a especificação da API foi dividida e organizada por **domínios de negócio** sob o diretório `openapi/`.

### Estrutura de Arquivos

```
backend/
├── openapi/
│   ├── openapi.yml            # Arquivo de entrada principal
│   └── domains/               # Organização por domínios de negócio
│       ├── auth/              # Domínio de Autenticação
│       │   ├── paths.yml      # Definições de rotas de Auth
│       │   └── schemas.yml    # Estruturas de dados (Auth Request/Response)
│       ├── user/              # Domínio de Usuários / Perfil
│       │   ├── paths.yml      # Definições de rotas de User
│       │   └── schemas.yml    # Estruturas de dados (User Request/Response)
│       ├── folders/           # Domínio de Pastas e Compartilhamento
│       │   ├── paths.yml      # Definições de rotas de Folders/Sharing
│       │   └── schemas.yml    # Estruturas de dados (Folder Request/Response)
│       └── documents/         # Domínio de Documentos e Explorer
│           ├── paths.yml      # Definições de rotas de Documentos
│           └── schemas.yml    # Estruturas de dados (Document Request/Response)
├── scripts/
│   └── build-openapi.js       # Script Node.js que junta tudo e copia para a pasta static
├── build-openapi.cmd          # Script em lote (.cmd) para rodar o build no Windows
├── openapi.yml                # API consolidada (gerado automaticamente)
└── src/main/resources/static/
    └── openapi.yml            # Cópia estática servida pelo backend (gerado automaticamente)
```

### ⚙️ Como compilar a documentação (Juntar os arquivos)

A compilação da documentação é **totalmente automatizada**! Ela foi integrada ao ciclo de vida de build do Maven (`exec-maven-plugin`). 

Sempre que você rodar os comandos padrão do projeto para compilar, dar build ou rodar, a documentação será atualizada:

```bash
# Compilar ou rodar o projeto compila o OpenAPI automaticamente
./mvnw compile
./mvnw spring-boot:run
```

#### Execução Manual (Opcional):
Caso deseje apenas compilar a documentação em tempo de design sem rodar/compilar o código Java:

- **No Windows**:
  ```bash
  .\build-openapi.cmd
  ```
- **Outros SOs / Geral**:
  ```bash
  node scripts/build-openapi.js
  ```

> [!NOTE]
> O processo de compilação utiliza o `@redocly/cli` via `npx` de forma automática, resolvendo todas as referências entre domínios locais de forma estática e sem precisar instalar dependências adicionais no backend.
