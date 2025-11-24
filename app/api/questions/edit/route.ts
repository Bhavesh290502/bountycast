import { NextRequest, NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export async function PUT(req: NextRequest) {
    try {
        const { questionId, fid, question, category, tags, isPrivate } = await req.json();

        if (!questionId || !fid) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify the user owns this question
        const checkResult = await sql`SELECT fid FROM questions WHERE id = ${questionId}`;
        if (checkResult.rows.length === 0) {
            return NextResponse.json({ error: 'Question not found' }, { status: 404 });
        }

        if (checkResult.rows[0].fid !== fid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const updatedAt = Date.now();

        await sql`
            UPDATE questions 
            SET 
                question = COALESCE(${question}, question),
                category = COALESCE(${category}, category),
                tags = COALESCE(${tags}, tags),
                is_private = COALESCE(${isPrivate}, is_private),
                updated_at = ${updatedAt}
            WHERE id = ${questionId}
        `;

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
    }
}
