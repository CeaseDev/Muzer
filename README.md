This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

Muzer
Welcome to the Muzer! This application allows streamers and viewers to interactively play and vote on music tracks in real time. Viewers can submit YouTube or Spotify URLs, upvote tracks, and watch as the streamer plays the music live. The app is built using Next.js for the frontend and backend, with WebSockets for real-time communication, Redis for queue management, and Prisma with PostgreSQL for database interactions.

Features
Real-Time Interaction: Streamers can play music while viewers vote on tracks.
Music Queue: Users can submit music URLs, and tracks are queued for playback.
Voting System: Viewers can upvote tracks to influence the playback order.
Responsive Design: Works seamlessly on various devices.
Authentication: Secure sign-in using NextAuth with Google Provider.
Setup Guide
Prerequisites
Node.js: Ensure you have Node.js installed. (v14 or later recommended)
PostgreSQL: A PostgreSQL database instance running.
Redis: A Redis server for managing the music queue.
Getting Started
Clone the Repository

bash
Copy code
git clone https://github.com/ceaseDev/Muzer.git
cd Muzer
Install Dependencies

Navigate to the app directory and install the required packages:

bash
Copy code
cd app
npm install
Set Up Environment Variables

Create a .env file in the app directory and configure the following variables:

plaintext
Copy code
DATABASE_URL=postgresql://user:password@localhost:5432/yourdbname
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
Run Database Migrations

Use Prisma to set up your database schema:

bash
Copy code
npx prisma migrate dev --name init
Start the Application

Start the Next.js development server:

bash
Copy code
npm run dev
The application will be running at http://localhost:3000.

Access the Application

Open your browser and navigate to http://localhost:3000 to start using the app.
## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
