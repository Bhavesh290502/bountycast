import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await sql`TRUNCATE TABLE answers, questions, notifications, user_notification_tokens CASCADE;`;
        return NextResponse.json({ message: "Database reset successfully" });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to reset database" }, { status: 500 });
    }
}
