import NextAuth from 'next-auth';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';
import { authConfig } from './auth.config';
import { connectDB } from './mongoose';
import { User } from '@/models/User';
import { Email } from '@/models/Email';

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
    async createUser({ user }) {
      await connectDB();

      // Promote to admin if this is the designated admin email
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && user.email === adminEmail) {
        await User.findByIdAndUpdate(user.id, { role: 'admin' });
      }

      // Claim any emails that arrived before this user registered
      if (user.email && user.id) {
        const claimed = await Email.updateMany(
          { pendingRecipientEmail: new RegExp(`^${user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          { $set: { userId: user.id }, $unset: { pendingRecipientEmail: '' } }
        );
        if (claimed.modifiedCount > 0) {
          console.log(`Claimed ${claimed.modifiedCount} pending email(s) for new user: ${user.email}`);
        }
      }
    },
  },
});

