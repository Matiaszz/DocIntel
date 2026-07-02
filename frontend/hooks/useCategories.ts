import { useState, useEffect, useMemo } from 'react';
import { fetchClient } from '../lib/api';

export interface CategoryDetail {
  id: string;
  label: string;
  type: string;
  description: string;
  color: string;
}

const DEFAULT_CATEGORIES: CategoryDetail[] = [
  { id: 'GENERAL', label: 'Geral', type: 'Geral', description: 'Documentos gerais de uso cotidiano', color: 'zinc' },
  { id: 'CONTRACT', label: 'Contrato', type: 'Contrato', description: 'Contratos de prestação de serviços ou termos de adesão', color: 'emerald' },
  { id: 'FINANCIAL', label: 'Financeiro', type: 'Financeiro', description: 'Relatórios de receitas, orçamentos e demonstrativos', color: 'blue' },
  { id: 'LEGAL', label: 'Legal', type: 'Legal', description: 'Documentos jurídicos, procurações e processos', color: 'purple' },
  { id: 'HR', label: 'Recursos Humanos', type: 'Recursos Humanos', description: 'Documentos e registros de colaboradores', color: 'rose' }
];

let cachedCategories: CategoryDetail[] | null = null;
let cachedPromise: Promise<CategoryDetail[]> | null = null;

const colorPriority: Record<string, number> = {
  emerald: 1,
  blue: 2,
  purple: 3,
  rose: 4,
  amber: 5,
  zinc: 6
};

const sortCategories = (list: CategoryDetail[]): CategoryDetail[] => {
  return [...list].sort((a, b) => {
    const priorityA = colorPriority[a.color] || 99;
    const priorityB = colorPriority[b.color] || 99;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.label.localeCompare(b.label);
  });
};

/**
 * Reusable hook to fetch static document categories with in-memory caching and optimized lookup mapping.
 */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryDetail[]>(
    cachedCategories ? sortCategories(cachedCategories) : sortCategories(DEFAULT_CATEGORIES)
  );
  const [loading, setLoading] = useState(!cachedCategories);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedCategories) {
      setCategories(sortCategories(cachedCategories));
      setLoading(false);
      return;
    }

    if (!cachedPromise) {
      cachedPromise = fetchClient.internal.request<CategoryDetail[]>('/api/documents/categories')
        .then(data => {
          if (data && data.length > 0) {
            cachedCategories = data;
          } else {
            cachedCategories = DEFAULT_CATEGORIES;
          }
          return cachedCategories;
        })
        .catch(err => {
          cachedPromise = null; // Clear failed promise to allow retrying on next mount
          throw err;
        });
    }

    cachedPromise
      .then(data => {
        setCategories(sortCategories(data));
      })
      .catch(err => {
        console.error('Error loading categories from API, using defaults:', err);
        setError('Falha ao obter categorias em tempo real. Usando padrões locais.');
        setCategories(sortCategories(DEFAULT_CATEGORIES));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // O(1) Pre-computed lookup map for high performance (60 FPS rendering)
  const categoryMap = useMemo(() => {
    const map: Record<string, CategoryDetail> = {};
    categories.forEach(c => {
      map[c.id.toUpperCase()] = c;
    });
    // Align legacy names/aliases
    if (map['FINANCIAL']) map['FINANCE'] = map['FINANCIAL'];
    if (map['HUMAN_RESOURCES']) map['HR'] = map['HUMAN_RESOURCES'];
    return map;
  }, [categories]);

  /**
   * Resolves a category by ID or alias instantly.
   */
  const resolveCategory = (catId: string | null | undefined): CategoryDetail | undefined => {
    if (!catId) return undefined;
    return categoryMap[catId.toUpperCase()];
  };

  /**
   * Resolves badge background and border classes.
   */
  const getBadgeColor = (catId: string | null | undefined): string => {
    const defaultColor = 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-750';
    const found = resolveCategory(catId);
    if (!found) return defaultColor;

    switch (found.color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-705 border-emerald-205 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'blue':
        return 'bg-blue-50 text-blue-705 border-blue-205 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/30';
      case 'purple':
        return 'bg-purple-50 text-purple-705 border-purple-205 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/30';
      case 'rose':
        return 'bg-rose-50 text-rose-755 border-rose-205 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/30';
      case 'amber':
        return 'bg-amber-50 text-amber-705 border-amber-205 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/30';
      default:
        return defaultColor;
    }
  };

  return { categories, resolveCategory, getBadgeColor, loading, error };
}
