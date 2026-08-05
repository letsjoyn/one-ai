import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";

function SourceAccordion({ sources = [] }) {
    const [open, setOpen] = useState(false);

    if (!sources.length) {
        return null;
    }

    return (
        <div className="mt-4 border border-line bg-subtle/50 text-sm">
            <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
            >
                <span className="flex items-center gap-2 text-xs font-semibold">
                    <FileText size={14} className="text-secondary" />
                    {sources.length} {sources.length === 1 ? "source" : "sources"}
                </span>
                <ChevronDown className={`text-secondary transition ${open ? "rotate-180" : ""}`} size={15} />
            </button>
            {open && (
                <div className="divide-y divide-line border-t border-line">
                    {sources.map((source, index) => (
                        <div key={`${source.documentId}-${index}`} className="bg-surface p-3">
                            <p className="truncate font-mono text-[11px] text-secondary" title={source.sourcePath}>
                                {source.sourcePath || "Unknown document"} - chunk {source.chunk ?? "-"}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-primary">{source.snippet}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SourceAccordion;
