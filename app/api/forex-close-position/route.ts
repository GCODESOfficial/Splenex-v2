import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { positionId } = await request.json()

    if (!positionId) {
      return NextResponse.json({ error: "Position ID required" }, { status: 400 })
    }

    // Simulate position closing
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100))

    return NextResponse.json({
      success: true,
      positionId,
      closedAt: Date.now(),
    })
  } catch (error) {
    console.error("Close position error:", error)
    return NextResponse.json({ error: "Failed to close position" }, { status: 500 })
  }
}
