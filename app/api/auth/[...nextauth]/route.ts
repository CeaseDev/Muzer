import { PrismaAdapter } from "@next-auth/prisma-adapter";
import NextAuth, { Session, User  ,} from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import {prisma} from "@/app/lib/db"
import { JWT } from "next-auth/jwt";

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      }),
    ],
    callbacks: {
        async session({
          session,
          token,
          user,
        }: {
          session: Session;
          token: JWT;
          user: User;
        }) {
          if (user) {
            session.user.id = user.id; // Add id to session.user
          }
          return session;
        },
      },
    };

const handler = NextAuth(authOptions);


export {handler as GET , handler as POST}