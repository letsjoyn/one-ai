import { ChevronDown } from "lucide-react";
import { useState } from "react";

function SourceAccordion({ sources = [] }) {
    const [open, setOpen] = useState(false);

    if (!sources.length) {
        return null;
    }

    return (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <button className="flex w-full items-center justify-between" onClick={() => setOpen((v) => !v)}>
                <span className="font-medium">View {sources.length} sources</span>
                <ChevronDown className={`transition ${open ? "rotate-180" : ""}`} size={16} />
            </button>
            {open && (
                <div className="mt-2 space-y-2 text-slate-600">
                    {sources.map((source, index) => (
                        <div key={`${source.documentId}-${index}`} className="rounded-md border border-slate-200 bg-white p-2">
                            <p className="font-mono text-xs">{source.sourcePath} | chunk {source.chunk}</p>
                            <p>{source.snippet}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SourceAccordion;
