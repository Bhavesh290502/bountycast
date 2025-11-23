import { NextRequest, NextResponse } from 'next/server';
import { checkEligibility } from '../../../lib/neynar';

export async function GET(req: NextRequest) {
    const fid = Number(req.nextUrl.searchParams.get('fid'));

    if (!fid) {
        return NextResponse.json({ error: 'fid required' }, { status: 400 });
    }

    const result = await checkEligibility(fid);

    if (result.allowed) {
        return NextResponse.json({ allowed: true });
    } else {
        return NextResponse.json({ allowed: false, reason: result.reason }, { status: 403 });
    }
}
