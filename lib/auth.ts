import NextAuth from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import { authConfig } from './auth.config';
import { connectDB } from './mongoose';
import { User } from '@/models/User';

// Shared MongoClient instance for the adapter (it needs the native driver, not mongoose)
const client = new MongoClient(process.env.DATABASE_URL!);
const clientPromise = client.connect();

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Fetch role from DB on sign-in
        await connectDB();
        const dbUser = await User.findById(user.id).select('role').lean();
        token.role = (dbUser as { role?: string } | null)?.role || 'user';
      }
      return token;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.email || !user?.id) return;
      await connectDB();

      const email = user.email.toLowerCase();

      // If this is a placeholder user that just signed up for real, activate them.
      const dbUser = await User.findOne({ email }).select('isPlaceholder role').lean() as
        | { isPlaceholder?: boolean; role?: string }
        | null;

      if (dbUser?.isPlaceholder) {
        await User.findOneAndUpdate(
          { email },
          { $set: { isPlaceholder: false } }
        );
        console.log(`Activated placeholder account for ${email}`);
      }

      // Promote to admin if this is the designated admin email (first real sign-in)
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && email === adminEmail.toLowerCase() && dbUser?.role !== 'admin') {
        await User.findOneAndUpdate({ email }, { $set: { role: 'admin' } });
      }
    },
  },
});

