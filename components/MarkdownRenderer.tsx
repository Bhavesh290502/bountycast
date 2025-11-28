import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content, className }: { content: string, className?: string }) {
    return (
        <div className={`prose prose-invert prose-sm max-w-none break-words ${className || ''}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ node, ...props }) => <a {...props} className="text-brand-purple hover:underline" target="_blank" rel="noopener noreferrer" />,
                    code: ({ node, inline, className, children, ...props }: any) => {
                        return !inline ? (
                            <div className="bg-black/30 rounded-lg p-3 my-2 overflow-x-auto border border-white/10 font-mono text-xs">
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </div>
                        ) : (
                            <code className="bg-white/10 rounded px-1 py-0.5 text-brand-gold text-xs font-mono" {...props}>
                                {children}
                            </code>
                        )
                    },
                    p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0 leading-relaxed" />,
                    ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-4 mb-2 space-y-1" />,
                    ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-4 mb-2 space-y-1" />,
                    blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-2 border-brand-purple pl-3 italic text-gray-400 my-2" />,
                    h1: ({ node, ...props }) => <h1 {...props} className="text-xl font-bold mb-2 mt-4 text-white" />,
                    h2: ({ node, ...props }) => <h2 {...props} className="text-lg font-bold mb-2 mt-3 text-white" />,
                    h3: ({ node, ...props }) => <h3 {...props} className="text-md font-bold mb-1 mt-2 text-white" />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
