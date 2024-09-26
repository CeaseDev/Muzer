"use client"
import React from "react";
import { signIn, signOut, useSession } from "next-auth/react";
 
export function Appbar() {
    const session = useSession();
    return (
        <div className="flex justify-between items-center m-5">
            <h1 className="text-3xl font-extrabold ">Muzer</h1>
            <div className="flex max-w-sm rounded-xl bg-gradient-to-tr from-pink-300 to-blue-300 p-0.5 shadow-lg"> 
                {session.data?.user && <button className="flex-1 font-bold text-xl bg-white px-6 py-3 rounded-xl" onClick={() => signOut() } > Log out</button> }
                {!session.data?.user && <button className="flex-1 font-bold text-xl bg-white px-6 py-3 rounded-xl" onClick={() => signIn() } > Sign In</button> }
            </div>
        </div>
    )
}