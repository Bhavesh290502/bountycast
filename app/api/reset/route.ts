import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await sql`TRUNCATE TABLE answers, questions, notifications CASCADE;`;
        return NextResponse.json({ message: "Database reset successfully" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to reset database", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
