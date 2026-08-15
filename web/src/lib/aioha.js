import { initAioha } from '@aioha/aioha'

// Single shared Aioha instance so both the login flow and the logout flow
// (AuthContext) operate on the same session state.
export const aioha = initAioha()