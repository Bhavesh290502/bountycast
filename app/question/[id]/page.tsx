import { Metadata } from 'next';
import { sql } from '@vercel/postgres';

type Props = {
    params: Promise<{ id: string }>
}

async function getQuestion(id: string) {
    try {
        const { rows } = await sql`SELECT * FROM questions WHERE id = ${id}`;
        return rows[0];
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function generateMetadata(
    { params }: Props
): Promise<Metadata> {
    const { id } = await params;
    const question = await getQuestion(id);

    if (!question) {
        return {
            title: 'Question Not Found',
        };
    }

    const ogUrl = new URL('https://bountycast.vercel.app/api/og');
    ogUrl.searchParams.set('title', question.question);
    ogUrl.searchParams.set('bounty', question.bounty.toString());
    ogUrl.searchParams.set('username', question.username);

    return {
        title: `${question.bounty} ETH Bounty: ${question.question.slice(0, 50)}...`,
        description: `Help @${question.username} solve this bounty on BountyCast!`,
        openGraph: {
            title: `${question.bounty} ETH Bounty: ${question.question.slice(0, 50)}...`,
            description: `Help @${question.username} solve this bounty on BountyCast!`,
            images: [ogUrl.toString()],
        },
        other: {
            "fc:frame": "vNext",
            "fc:frame:image": ogUrl.toString(),
            "fc:frame:button:1": "View Bounty",
            "fc:frame:button:1:action": "link",
            "fc:frame:button:1:target": `https://bountycast.vercel.app/?id=${id}`
        }
    };
}

export default async function QuestionPage({ params }: Props) {
    const { id } = await params;

    // Client-side redirect to the main app
    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Redirecting to Bounty...</h1>
                <p className="text-gray-400">If you are not redirected automatically, <a href={`/?id=${id}`} className="text-brand-purple underline">click here</a>.</p>
                <meta httpEquiv="refresh" content={`0;url=/?id=${id}`} />
            </div>
        </div>
    );
}
