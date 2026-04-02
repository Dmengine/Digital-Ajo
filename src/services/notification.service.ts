export const notify = async (userId: string, message: string): Promise<void> => {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[notify] ${userId}: ${message}`);
  }
};
