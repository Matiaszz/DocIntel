# ADR-0001 - Escolha do Argon2id para Hash de Senhas

### Status
Aceito

### Contexto
O sistema DocIntel precisa armazenar senhas de forma segura.
Foram avaliados BCrypt, Argon2id e PBKDF2.

### Decisão
Utilizar BCrypt através do PasswordEncoder do Spring Security.

### Consequências
#### Positivas:
- Algoritmo moderno.
- Suporte no Spring Security.
- Consome menos memória que Argon.
#### Negativas:
- Menor resistência a ataques com GPU comparado a Argon.
