// app/api/answers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
    const questionId = Number(new URL(req.url).searchParams.get('questionId'));
    if (!questionId) {
        return NextResponse.json(
            { error: 'questionId required' },

import { checkEligibility } from '../../../lib/neynar';

        export async function POST(req: NextRequest) {
            const body = await req.json();
            const { questionId, fid, username, address, answer } = body || {};

            if (!questionId || !answer) {
                return NextResponse.json(
                    { error: 'questionId and answer required' },
                    { status: 400 }
                );
            }

            if (!fid) {
                return NextResponse.json(
                    { error: 'fid required (please log in)' },
                    { status: 400 }
                );
            }

            // Check Eligibility
            const eligibility = await checkEligibility(fid);
            if (!eligibility.allowed) {
                return NextResponse.json(
                    { error: eligibility.reason },
                    { status: 403 }
                );
            }

            try {
                // Check if user already answered this question
                const { rowCount } = await sql`
            SELECT 1 FROM answers 
            WHERE questionId = ${questionId} AND fid = ${fid}
        `;

                if (rowCount && rowCount > 0) {
                    return NextResponse.json(
                        { error: 'You have already answered this question' },
                        { status: 400 }
                    );
                }

                const { rows } = await sql`
      INSERT INTO answers (questionId, fid, username, address, answer, upvotes)
      VALUES (${questionId}, ${fid}, ${username || 'anon'}, ${address || ''}, ${answer}, 0)
      RETURNING id;
    `;
                return NextResponse.json({ id: rows[0].id });
            } catch (error) {
                console.error(error);
                return NextResponse.json({ error: 'Insert error' }, { status: 500 });
            }
        }

