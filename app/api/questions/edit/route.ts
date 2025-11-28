import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function PUT(req: NextRequest) {
    try {
        const { questionId, fid, question, category, tags } = await req.json();

        if (!questionId || !fid) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!question || !question.trim()) {
            return NextResponse.json({ error: 'Question cannot be empty' }, { status: 400 });
        }

        // Verify the user owns this question
        const checkResult = await sql`SELECT fid, question, original_question FROM questions WHERE id = ${questionId}`;
        if (checkResult.rows.length === 0) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        const currentQ = checkResult.rows[0];

        if (currentQ.fid !== fid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (currentQ.original_question) {
            return NextResponse.json({ error: 'Question can only be edited once' }, { status: 400 });
        }

        const updatedAt = Date.now();

        await sql`
            UPDATE questions 
            SET 
                question = ${question},
                original_question = ${currentQ.question},
                category = COALESCE(${category}, category),
                tags = COALESCE(${tags}, tags),
                updated_at = ${updatedAt}
            WHERE id = ${questionId}
        `;

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }
}
