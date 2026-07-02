package com.docintel.document.domain;

import lombok.Getter;

import java.util.Arrays;
import java.util.stream.Collectors;

@Getter
public enum DocumentCategory {

    GENERAL("Geral", "Geral", "Documentos gerais de uso cotidiano", "zinc"),

    REPORT("Relatório", "Outros", "Relatórios, sumários e apresentações", "zinc"),
    FINANCIAL("Financeiro", "Financeiro", "Relatórios de receitas, orçamentos e demonstrativos", "blue"),
    INVOICE("Fatura", "Financeiro", "Faturas, notas fiscais e cobranças de fornecedores", "blue"),
    RECEIPT("Recibo", "Financeiro", "Recibos de pagamento e comprovantes de transações", "blue"),
    CONTRACT("Contrato", "Contrato", "Contratos de prestação de serviços ou termos de adesão", "emerald"),
    AGREEMENT("Acordo", "Contrato", "Acordos bilaterais e termos de parceria", "emerald"),
    PROPOSAL("Proposta", "Contrato", "Propostas comerciais e cotações de preços", "emerald"),
    QUOTATION("Cotação", "Contrato", "Cotações e orçamentos de fornecedores", "emerald"),

    LEGAL("Legal", "Legal", "Documentos jurídicos, procurações e processos", "purple"),
    TAX("Imposto", "Legal", "Declarações de impostos e guias de recolhimento", "purple"),
    INSURANCE("Seguro", "Legal", "Apólices de seguro e termos de cobertura", "purple"),

    HUMAN_RESOURCES("Recursos Humanos", "Recursos Humanos", "Documentos e registros de colaboradores", "rose"),
    PAYROLL("Folha de Pagamento", "Recursos Humanos", "Holerites e contracheques de funcionários", "rose"),
    RESUME("Currículo", "Recursos Humanos", "Currículos de candidatos e fichas de contratação", "rose"),
    CERTIFICATE("Certificado", "Recursos Humanos", "Certificados de conclusão e diplomas de cursos", "rose"),

    IDENTIFICATION("Identificação", "Outros", "Documentos de identidade civil e registros", "zinc"),
    PASSPORT("Passaporte", "Outros", "Passaportes e vistos de viagem", "zinc"),
    DRIVER_LICENSE("Carteira de Habilitação", "Outros", "Carteira nacional de habilitação", "zinc"),

    MEDICAL("Médico", "Outros", "Receitas médicas, exames e relatórios de saúde", "zinc"),
    PRESCRIPTION("Receita Médica", "Outros", "Receitas de medicamentos e orientações médicas", "zinc"),
    EXAM("Exame", "Outros", "Resultados de exames clínicos e laboratoriais", "zinc"),

    EDUCATION("Educação", "Outros", "Documentos educacionais e acadêmicos", "zinc"),
    DIPLOMA("Diploma", "Outros", "Diplomas de graduação e pós-graduação", "zinc"),
    TRANSCRIPT("Histórico Escolar", "Outros", "Históricos escolares e boletins acadêmicos", "zinc"),

    PROJECT("Projeto", "Outros", "Especificações técnicas e roadmaps de projetos", "amber"),
    TECHNICAL_DOCUMENTATION("Documentação Técnica", "Outros", "Documentação de sistemas e arquitetura", "amber"),
    MANUAL("Manual", "Outros", "Manuais de instrução e guias de uso", "amber"),
    SPECIFICATION("Especificação", "Outros", "Especificações de requisitos e normas técnicas", "amber"),

    PRESENTATION("Apresentação", "Outros", "Apresentações de slides e pitches", "zinc"),
    SPREADSHEET("Planilha", "Outros", "Planilhas de cálculo e tabelas financeiras", "zinc"),
    IMAGE("Imagem", "Outros", "Arquivos de imagem e fotografias", "zinc"),
    VIDEO("Vídeo", "Outros", "Arquivos de vídeo e animações", "zinc"),
    AUDIO("Áudio", "Outros", "Gravações de áudio e podcasts", "zinc"),

    NOTE("Nota", "Geral", "Notas de texto e anotações rápidas", "zinc"),
    LETTER("Carta", "Geral", "Correspondências formais e cartas", "zinc"),
    EMAIL("E-mail", "Geral", "Mensagens de e-mail e comunicações", "zinc"),

    OTHER("Outro", "Outros", "Arquivos diversos sem classificação definida", "zinc");

    private final String label;
    private final String type;
    private final String description;
    private final String color;

    DocumentCategory(String label, String type, String description, String color) {
        this.label = label;
        this.type = type;
        this.description = description;
        this.color = color;
    }

    public static DocumentCategory fromString(String categoryName) {
        return DocumentCategory.valueOf(categoryName.toUpperCase());
    }

    public static String aiClassificationPrompt() {
        String categories = Arrays.stream(values())
                .map(Enum::name)
                .collect(Collectors.joining(", "));

        return """
                Analyze the document content and classify it into exactly ONE of the following categories.

                Available categories:
                %s

                Rules:
                - Return ONLY the category name.
                - Do not explain your choice.
                - Do not return JSON or Markdown.
                - If no category clearly matches, return GENERAL.
                """.formatted(categories);
    }
}