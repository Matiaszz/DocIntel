# ADR-0001 - Escolha do Argon2id para Hash de Senhas

### Status
Aceito

### Contexto
O sistema DocIntel precisa armazenar senhas de forma segura.
Foram avaliados BCrypt, Argon2id e PBKDF2.

### Decisão
Utilizar Argon2id através do PasswordEncoder do Spring Security.

### Consequências
#### Positivas:
- Melhor resistência a ataques com GPU.
- Algoritmo moderno.
- Suporte no Spring Security.

#### Negativas:
- Consome mais memória que BCrypt.
