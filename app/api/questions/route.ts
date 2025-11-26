import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { checkEligibility } from '../../../lib/neynar';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const authorFid = searchParams.get('authorFid');
        const sort = searchParams.get('sort') || 'newest';

        let query = 'SELECT * FROM questions WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        // Search filter
        if (search) {
            query += ` AND question ILIKE $${paramIndex}`;
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

        // Don't show private questions in public list UNLESS it's the author viewing their own
        if (authorFid) {
            // If viewing own bounties, show private ones too (already filtered by fid)
        } else {
            query += ' AND (is_private = false OR is_private IS NULL)';
        }

        // Lazy Expiration: Check for expired active questions and update them
        const now = Date.now();
        await sql`
            UPDATE questions 
            SET status = 'expired' 
            WHERE status = 'active' AND deadline < ${now}
        `;

        // Sorting
        switch (sort) {
            case 'highest_bounty':
                query += ' ORDER BY CAST(bounty AS DECIMAL) DESC';
                break;
            case 'expiring_soon':
                query += ' ORDER BY deadline ASC';
                break;
            case 'newest':
            default:
                query += ' ORDER BY created DESC';
                break;
        }

        const { rows } = await sql.query(query, params);

        // Enrich with Neynar data
        const fids = rows.map(r => r.fid).filter(f => f > 0);
        if (fids.length > 0) {
            const { getBulkUserProfiles } = await import('../../../lib/neynar');
            const profiles = await getBulkUserProfiles(fids);

            const enrichedRows = rows.map(row => ({
                ...row,
                id: row.id,
                question: row.question,
                bounty: row.bounty,
                token: row.token,
                created: row.created,
                deadline: row.deadline,
                onchainId: row.onchainid ?? row.onchainId,
                status: row.status,
                address: row.address,
                category: row.category,
                tags: row.tags,
                isPrivate: row.is_private,
                updatedAt: row.updated_at,
                authorProfile: profiles[row.fid] || null
            }));
            return NextResponse.json(enrichedRows);
        }

        const formattedRows = rows.map(row => ({
            ...row,
            id: row.id,
            question: row.question,
            bounty: row.bounty,
            token: row.token,
            created: row.created,
            deadline: row.deadline,
            onchainId: row.onchainid ?? row.onchainId,
            status: row.status,
            address: row.address,
            category: row.category,
            tags: row.tags,
            isPrivate: row.is_private,
            updatedAt: row.updated_at,
        }));

        return NextResponse.json(formattedRows);
    } catch (error) {
        console.error('DB Error:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { fid, username, address, question, bounty, token, onchainId, deadline, category, tags, isPrivate } = body || {};

    if (!question || !bounty) {
        return NextResponse.json(
            { error: 'Question and bounty required' },
            { status: 400 }
        );
    }

    if (fid) {
        const eligibility = await checkEligibility(fid);
        if (!eligibility.allowed) {
            return NextResponse.json(
                { error: eligibility.reason },
                { status: 403 }
            );
        }
    }

    try {
        const { rows } = await sql`
      INSERT INTO questions (fid, username, address, question, bounty, token, created, deadline, onchainId, status, category, tags, is_private)
      VALUES (${fid || 0}, ${username || 'anon'}, ${address || ''}, ${question}, ${bounty}, ${token || 'ETH'}, ${Date.now()}, ${deadline}, ${onchainId}, 'active', ${category || null}, ${tags || null}, ${isPrivate || false})
      RETURNING id;
    `;
        return NextResponse.json({ id: rows[0].id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Insert error' }, { status: 500 });
    }
}
