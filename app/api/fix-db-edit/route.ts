import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS original_question TEXT;`;
        return NextResponse.json({ message: "Database schema updated: added original_question" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update schema", details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
