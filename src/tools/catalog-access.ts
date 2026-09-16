import { type CatalogIndex, loadCatalog } from "@/catalog"

let override: CatalogIndex | null = null

export function toolCatalog(): CatalogIndex {
  return override ?? loadCatalog()
}

export function setToolCatalog(index: CatalogIndex | null): void {
  override = index
}
