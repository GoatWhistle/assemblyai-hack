import type { ReactNode } from "react"
import { DocsNav } from "@/shared/ui/navigation/docs-nav"
import { DocsPager } from "@/shared/ui/navigation/docs-pager"
import { DocsShell } from "@/shared/ui/navigation/docs-shell"
import { DocsTreeProvider } from "@/shared/ui/navigation/docs-trail"
import { Toc } from "@/shared/ui/navigation/toc"
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
        nav={<DocsNav pages={DOCS_PAGES} />}
        toc={<Toc pages={DOCS_PAGES} />}
        mainId={MAIN_ID}
      >
        <DocsTreeProvider pages={DOCS_PAGES}>{children}</DocsTreeProvider>
        <DocsPager pages={DOCS_PAGES} />
        <Disclaimer />
      </DocsShell>
    </>
  )
}
