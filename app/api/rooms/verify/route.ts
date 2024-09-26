
import {prisma} from '@/app/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { roomId } = await req.json();

  if (!roomId) {
    return NextResponse.json({ error: 'Room ID is required'  , status: '405' });
  }

  try {
    console.log('Received roomId:', roomId);
    
    const room = await prisma.room.findUnique({
      where: {
        id: roomId,
      },
    });

    console.log(room);

    if (room) {
      return NextResponse.json({ exists: true });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    return NextResponse.json({ error: 'An error occurred while verifying the room ID' });
  }
}


