# ADR-0001 – Arquitetura do Sistema

## Status

Aceito

---

## Contexto

O DocIntel será um sistema para gerenciamento inteligente de documentos, com previsão de crescimento gradual em funcionalidades como:

* Autenticação e autorização
* Upload e armazenamento de documentos
* OCR
* Integração com IA
* Compartilhamento de documentos
* Auditoria
* Notificações
* Cache
* Mensageria
* Observabilidade

Embora inicialmente seja desenvolvido por uma única pessoa, o projeto tem como objetivo seguir boas práticas utilizadas em sistemas profissionais, facilitando manutenção, testes e evolução ao longo do tempo.

Uma arquitetura tradicional baseada apenas em camadas (`controller → service → repository`) tende a concentrar muitas responsabilidades em poucos pacotes conforme o sistema cresce, dificultando a navegação no código e aumentando o acoplamento entre funcionalidades.

Por outro lado, uma arquitetura baseada em microsserviços adicionaria uma complexidade operacional desnecessária para o estágio atual do projeto.

---

## Decisão

O sistema será desenvolvido como um **Monólito Modular**, organizado por domínio de negócio (feature-based), utilizando princípios da Clean Architecture dentro de cada módulo.

Cada módulo será responsável por encapsular sua própria lógica de negócio, contratos, persistência e camada de apresentação.

Estrutura base:

```text
src/main/java/com/docintel

├── auth
│   ├── application
│   ├── domain
│   ├── infrastructure
│   └── presentation
│
├── document
│   ├── application
│   ├── domain
│   ├── infrastructure
│   └── presentation
│
├── storage
├── ai
├── notification
├── audit
└── shared
```

Dentro de cada módulo:

* **presentation**

  * Controllers REST
  * DTOs de entrada e saída
  * Mapeamento HTTP

* **application**

  * Casos de uso
  * Orquestração da lógica da aplicação

* **domain**

  * Entidades
  * Value Objects
  * Interfaces de repositório
  * Regras de negócio

* **infrastructure**

  * Implementações JPA
  * Segurança
  * Integrações externas
  * Mensageria
  * Persistência

Os módulos deverão se comunicar preferencialmente através de interfaces e contratos bem definidos, evitando dependências diretas desnecessárias.

---

## Motivação

Esta arquitetura foi escolhida porque:

* mantém alta coesão entre classes relacionadas à mesma funcionalidade;
* reduz o acoplamento entre módulos;
* facilita manutenção conforme o número de funcionalidades aumenta;
* melhora a navegação no código;
* favorece testes unitários;
* permite substituir implementações externas com menor impacto;
* possibilita futura extração de módulos para microsserviços, caso necessário.

---

## Alternativas consideradas

### Arquitetura em camadas tradicional

**Vantagens**

* Simples de implementar.
* Menor quantidade inicial de classes.

**Desvantagens**

* Escala pior em projetos grandes.
* Pacotes de Service, Repository e DTO tendem a crescer excessivamente.
* Forte acoplamento entre funcionalidades.

---

### Microsserviços

**Vantagens**

* Escalabilidade independente.
* Isolamento completo entre domínios.

**Desvantagens**

* Complexidade operacional elevada.
* Necessidade de comunicação distribuída.
* Infraestrutura significativamente mais complexa.

Para o estágio atual do projeto, os custos superam os benefícios.

---

## Consequências

### Positivas

* Organização baseada em funcionalidades.
* Melhor legibilidade do projeto.
* Evolução incremental da arquitetura.
* Facilidade para adicionar novos módulos.
* Menor impacto de mudanças em funcionalidades existentes.

### Negativas

* Maior número de pacotes e classes.
* Curva de aprendizado ligeiramente superior.
* Necessidade de disciplina para manter o isolamento entre módulos.

---

## Impacto

Esta decisão servirá como base para toda a organização do código-fonte do projeto.

Novas funcionalidades deverão ser implementadas como módulos independentes, respeitando a estrutura definida neste ADR.

Alterações futuras na arquitetura deverão ser registradas em novos ADRs, mantendo o histórico das decisões arquiteturais do projeto.
