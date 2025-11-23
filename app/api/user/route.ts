import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '../../../lib/neynar';

export async function GET(req: NextRequest) {
    const fid = Number(req.nextUrl.searchParams.get('fid'));

    if (!fid) {
        return NextResponse.json({ error: 'fid required' }, { status: 400 });
    }

    const profile = await getUserProfile(fid);

    if (profile) {
        return NextResponse.json(profile);
    } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
}
