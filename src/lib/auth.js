/*
  auth.js
  The sign-in call. For now there are no fields or provider yet, so it signs
  straight in. Replace the body with the real call (Supabase, Google…) when the
  fields are decided: resolve on success, throw an Error with a readable
  message on failure. The sign-in card shows "Signing in…" while this runs and
  the error message if it throws.
*/
export async function signIn() {
  // e.g. const { error } = await supabase.auth.signInWithPassword({ email, password })
  //      if (error) throw new Error("That email and password don't match.")
}
