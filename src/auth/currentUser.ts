// The signed-in user's id for code outside React (personal category rules). AuthProvider keeps it
// in sync; null while signed out.
let currentUserId: string | null = null;

export const getCurrentUserId = () => currentUserId;
export const setCurrentUserId = (id: string | null) => {
  currentUserId = id;
};
