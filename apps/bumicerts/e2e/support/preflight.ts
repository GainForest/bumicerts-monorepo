/**
 * Pre-flight checks before running E2E tests
 * Verifies that the dev server is running and accessible
 */

export async function checkDevServer(baseUrl: string): Promise<void> {
  console.log(`\n🔍 Checking if dev server is running at ${baseUrl}...`)
  
  try {
    const response = await fetch(baseUrl, { method: 'HEAD' })
    
    if (response.ok) {
      console.log('✅ Dev server is running!\n')
    } else {
      console.error(`❌ Dev server responded with status ${response.status}`)
      throw new Error('Dev server is not healthy')
    }
  } catch (error) {
    console.error('\n❌ FATAL ERROR: Cannot connect to dev server!\n')
    console.error(`Expected URL: ${baseUrl}`)
    console.error('\n📋 To fix this:')
    console.error('1. Open a new terminal')
    console.error('2. Run: cd apps/bumicerts && bun dev')
    console.error('3. Wait for "Ready on http://localhost:3001"')
    console.error('4. Then run your tests again\n')
    
    process.exit(1)
  }
}
