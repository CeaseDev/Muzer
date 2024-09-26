import { z } from 'zod';
import {prisma} from "@/app/lib/db";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

const CreateRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100, 'Room name cannot exceed 100 characters'),
});


export async function POST( req : Request  ) {
    const session = await getServerSession(authOptions) ; 

    if(!session){
        return NextResponse.json({error : "Unautorized" , status : 401}) ; 
    }

    try{
        const data = await req.json() ;
        const validData = CreateRoomSchema.parse(data) ; 

        const Room = await prisma.room.create({
            data: {
                name: validData.name,
                creator: { connect: { id: (session.user?.id) } },
            }
        });


        return NextResponse.json({ message : Room  , status : 200});
    } 
    catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json({ error: error.errors });
        }
        console.error('Error creating room:', error);
        return NextResponse.json({ error: 'Internal server error'  , status : 500});
    }
}
