import type { ReactNode } from "react"
import { DocsNav } from "@/shared/ui/navigation/docs-nav"
import { DocsShell } from "@/shared/ui/navigation/docs-shell"
import { Toc } from "@/shared/ui/navigation/toc"
import { SiteHeader } from "@/shared/ui/primitives/site-header"
import { Disclaimer } from "@/shared/ui/states/disclaimer"
import { DOCS_PAGES } from "./docs-map"

const MAIN_ID = "main"

export default function DocsLayout({ children }: { readonly children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href={`#${MAIN_ID}`}>
        Skip to the content
      </a>
      <DocsShell
        header={<SiteHeader current="docs" />}
        nav={<DocsNav pages={DOCS_PAGES} />}
        toc={<Toc pages={DOCS_PAGES} />}
        mainId={MAIN_ID}
      >
        {children}
        <Disclaimer />
      </DocsShell>
    </>
  )
}
