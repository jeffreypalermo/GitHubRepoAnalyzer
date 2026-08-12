/**
 * Test-only re-exports of internal cache helpers so they can be inspected
 * in unit tests without modifying the production module.
 */
export { cacheGet, cacheSet } from './githubClient.internal'
