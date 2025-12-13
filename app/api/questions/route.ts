import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { checkEligibility } from '../../../lib/neynar';
import { ErrorResponses, formatErrorResponse } from '../../../lib/errors';
import { checkRateLimit } from '../../../lib/rate-limiter';
import { Validators } from '../../../lib/validation';
import { RATE_LIMIT_CONFIG } from '../../../lib/constants';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const authorFid = searchParams.get('authorFid');
        const id = searchParams.get('id');
        const sort = searchParams.get('sort') || 'newest';

        let query = 'SELECT * FROM questions WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        // Search filter
        if (search) {
            query += ` AND (question ILIKE $${paramIndex} OR username ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Category filter
        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        // Status filter
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Author filter (My Bounties)
        if (authorFid) {
            query += ` AND fid = $${paramIndex}`;
            params.push(authorFid);
            paramIndex++;
        }

        // ID filter (Deep Linking)
        if (id) {
            query += ` AND id = $${paramIndex}`;
            params.push(id);
            paramIndex++;
        }

        // Sorting
        if (sort === 'newest') {
            query += ' ORDER BY created DESC';
        } else if (sort === 'oldest') {
            query += ' ORDER BY created ASC';
        } else if (sort === 'highest_bounty') {
            query += ' ORDER BY bounty DESC';
        } else if (sort === 'expiring_soon') {
            query += ' ORDER BY deadline ASC';
        }

        const result = await sql.query(query, params);

        // Enrich with Neynar data
        const authorFids = result.rows.map(r => r.fid).filter(f => f > 0);
        const winnerFids = result.rows.map(r => r.winner_fid).filter((f: any) => f > 0);
        const fids = [...new Set([...authorFids, ...winnerFids])];
        if (fids.length > 0) {
            const { getBulkUserProfiles } = await import('../../../lib/neynar');
            const profiles = await getBulkUserProfiles(fids);

            const enrichedRows = result.rows.map(row => ({
                id: row.id,
                fid: row.fid,
                username: row.username,
                question: row.question,
                bounty: row.bounty,
                token: row.token,
                created: row.created,
                deadline: row.deadline,
                onchainId: row.onchainid || row.onchainId || row.onchain_id,
                status: row.status,
                address: row.address,
                active: row.active,
                category: row.category,
                tags: row.tags,
                updatedAt: row.updated_at,
                winner_fid: row.winner_fid,
                original_question: row.original_question,
                authorProfile: profiles[row.fid] || null,
                winnerProfile: row.winner_fid ? profiles[row.winner_fid] : null,
            }));
            return NextResponse.json(enrichedRows);
        }

        const plainRows = result.rows.map(row => ({
            id: row.id,
            fid: row.fid,
            username: row.username,
            question: row.question,
            bounty: row.bounty,
            token: row.token,
            created: row.created,
            deadline: row.deadline,
            onchainId: row.onchainid || row.onchainId || row.onchain_id,
            status: row.status,
            address: row.address,
            active: row.active,
            category: row.category,
            tags: row.tags,
            updatedAt: row.updated_at,
            winner_fid: row.winner_fid,
            original_question: row.original_question,
        }));
        return NextResponse.json(plainRows);
    } catch (error) {
        const formattedError = formatErrorResponse(ErrorResponses.DATABASE_ERROR('Failed to fetch questions'));
        return NextResponse.json(
            { error: formattedError.error, code: formattedError.code },
            { status: formattedError.statusCode }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fid, username, address, question, bounty, token, onchainId, deadline, category, tags } = body || {};

        // Rate limiting
        if (fid) {
            const rateLimit = checkRateLimit(
                `questions:${fid}`,
                RATE_LIMIT_CONFIG.QUESTIONS_PER_HOUR,
                60 * 60 * 1000 // 1 hour
            );

            if (!rateLimit.allowed) {
                const error = ErrorResponses.RATE_LIMIT_EXCEEDED(
                    `Too many questions. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 60000)} minutes`
                );
                const formatted = formatErrorResponse(error);
                return NextResponse.json(
                    { error: formatted.error, code: formatted.code },
                    { status: formatted.statusCode }
                );
            }
        }

        // Validate required fields
        if (!question || !bounty) {
            const error = ErrorResponses.MISSING_FIELDS(['question', 'bounty']);
            const formatted = formatErrorResponse(error);
            return NextResponse.json(
                { error: formatted.error, code: formatted.code },
                { status: formatted.statusCode }
            );
        }

        // Validate question text
        const questionValidation = Validators.question(question);
        if (!questionValidation.valid) {
            const error = ErrorResponses.VALIDATION_ERROR(questionValidation.error!);
            const formatted = formatErrorResponse(error);
            return NextResponse.json(
                { error: formatted.error, code: formatted.code },
                { status: formatted.statusCode }
            );
        }

        // Validate bounty amount
        const bountyValidation = Validators.bountyAmount(bounty);
        if (!bountyValidation.valid) {
            const error = ErrorResponses.VALIDATION_ERROR(bountyValidation.error!);
            const formatted = formatErrorResponse(error);
            return NextResponse.json(
                { error: formatted.error, code: formatted.code },
                { status: formatted.statusCode }
            );
        }

        // Check eligibility
        if (fid) {
            const eligibility = await checkEligibility(fid);
            if (!eligibility.allowed) {
                const error = ErrorResponses.NOT_ELIGIBLE(eligibility.reason!);
                const formatted = formatErrorResponse(error);
                return NextResponse.json(
                    { error: formatted.error, code: formatted.code },
                    { status: formatted.statusCode }
                );
            }
        }

        const { rows } = await sql`
            INSERT INTO questions (fid, username, address, question, bounty, token, created, deadline, onchainId, status, category, tags)
            VALUES (${fid || 0}, ${username || 'anon'}, ${address || ''}, ${question}, ${bounty}, ${token || 'ETH'}, ${Date.now()}, ${deadline}, ${onchainId}, 'active', ${category || null}, ${tags || null})
            RETURNING id;
        `;
        return NextResponse.json({ id: rows[0].id });
    } catch (error) {
        const formattedError = formatErrorResponse(ErrorResponses.DATABASE_ERROR('Failed to create question'));
        return NextResponse.json(
            { error: formattedError.error, code: formattedError.code },
            { status: formattedError.statusCode }
        );
    }
}
