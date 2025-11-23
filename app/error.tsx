'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
            <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong!</h2>
            <div className="bg-gray-900 p-4 rounded-lg mb-4 text-left max-w-full overflow-auto">
                <p className="text-red-400 font-mono text-xs">{error.message}</p>
                {error.stack && (
                    <pre className="text-gray-500 text-[10px] mt-2">{error.stack}</pre>
                )}
            </div>
            <button
                onClick={() => reset()}
                className="px-4 py-2 bg-brand-purple text-white rounded hover:bg-brand-purple-dark"
            >
                Try again
            </button>
        </div>
    );
}
