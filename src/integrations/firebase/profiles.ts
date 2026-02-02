import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import { User } from 'firebase/auth';

/**
 * Creates or updates a user profile in Firestore
 * Called after successful authentication
 */
export const createUserProfile = async (user: User): Promise<void> => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);

  // Check if profile already exists
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create new profile
    const displayName = user.displayName || user.phoneNumber || 'User';
    const email = user.email || '';

    await setDoc(userRef, {
      displayName,
      email,
      phoneNumber: user.phoneNumber || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('User profile created successfully');
  } else {
    // Update existing profile's updatedAt timestamp
    await setDoc(
      userRef,
      {
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    console.log('User profile updated successfully');
  }
};
