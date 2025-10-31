/**
 * Test script for the Notes API
 * Run with: tsx server/test-api.ts
 */

const API_BASE = 'http://localhost:3001/api';

interface PassNote {
  pass_id: string;
  note_text: string;
  created_at: string;
  created_by: string;
}

// Test data
const TEST_ORG_ID = 'test-org-123';
const TEST_LOCATION_ID = 'test-location-456';
const TEST_ROBOT_ID = 'test-robot-789';
const TEST_PASS_ID_1 = 'pass-001-test';
const TEST_PASS_ID_2 = 'pass-002-test';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function testCreateNote() {
  console.log('\n1. Testing POST /api/notes (Create Note)...');

  const noteData = {
    organization_id: TEST_ORG_ID,
    location_id: TEST_LOCATION_ID,
    robot_id: TEST_ROBOT_ID,
    pass_id: TEST_PASS_ID_1,
    note_text: 'This is a test note for pass 1',
    created_by: 'test-script'
  };

  const response = await fetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noteData)
  });

  const result = await response.json();
  console.log('Response:', response.status);

  assert(response.ok, `Expected response.ok to be true, got ${response.status}`);
  assert(result.pass_id === TEST_PASS_ID_1, `Expected pass_id to be ${TEST_PASS_ID_1}`);
  console.log('✓ Note created successfully');
}

async function testUpsertNotesForMultiplePasses() {
  console.log('\n2. Testing upsert notes for different passes...');

  const notes = [
    {
      organization_id: TEST_ORG_ID,
      location_id: TEST_LOCATION_ID,
      robot_id: TEST_ROBOT_ID,
      pass_id: TEST_PASS_ID_1,
      note_text: 'Updated note for pass 1',
      created_by: 'test-script'
    },
    {
      organization_id: TEST_ORG_ID,
      location_id: TEST_LOCATION_ID,
      robot_id: TEST_ROBOT_ID,
      pass_id: TEST_PASS_ID_2,
      note_text: 'Test note for pass 2',
      created_by: 'test-script'
    }
  ];

  for (const note of notes) {
    const response = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    const result = await response.json();
    console.log(`Pass ${note.pass_id}:`, response.status);
    assert(response.ok, `Upsert failed for pass ${note.pass_id} with status ${response.status}`);
    assert(result.note_text === note.note_text, `Note text for ${note.pass_id} was not updated`);
  }
  console.log('✓ Multiple notes upserted');
}

async function testFetchNotes(expectedLength: number) {
  console.log(`\n3. Testing GET /api/notes (Fetch ${expectedLength} Notes)...`);

  const params = new URLSearchParams({
    organizationId: TEST_ORG_ID,
    robotId: TEST_ROBOT_ID,
    locationId: TEST_LOCATION_ID,
    passIds: `${TEST_PASS_ID_1},${TEST_PASS_ID_2}`
  });

  const response = await fetch(`${API_BASE}/notes?${params}`);
  const notes: PassNote[] = await response.json();

  console.log('Response:', response.status);
  assert(response.ok, `Expected response.ok to be true, got ${response.status}`);
  assert(notes.length === expectedLength, `Expected to fetch ${expectedLength} notes, but got ${notes.length}`);

  console.log('Notes fetched:', notes.length);
  notes.forEach(note => {
    console.log(`  - Pass ${note.pass_id}: "${note.note_text}"`);
  });

  console.log('✓ Notes fetched successfully');
}

async function testDeleteAllNotes() {
  console.log('\n4. Testing DELETE /api/notes (Delete All Notes for Pass)...');

  const params = new URLSearchParams({
    organizationId: TEST_ORG_ID,
    robotId: TEST_ROBOT_ID,
    locationId: TEST_LOCATION_ID,
    passId: TEST_PASS_ID_2
  });

  const response = await fetch(`${API_BASE}/notes?${params}`, {
    method: 'DELETE'
  });

  const result = await response.json();
  console.log('Response:', response.status, result);
  assert(response.ok, `Expected response.ok to be true, got ${response.status}`);
  assert(result.deletedCount === 1, `Expected deletedCount to be 1, but got ${result.deletedCount}`);
  console.log(`✓ Deleted ${result.deletedCount} notes for pass ${TEST_PASS_ID_2}`);
}

async function cleanupTestData() {
  console.log('\n6. Cleaning up test data...');

  const passIds = [TEST_PASS_ID_1, TEST_PASS_ID_2];

  for (const passId of passIds) {
    const params = new URLSearchParams({
      organizationId: TEST_ORG_ID,
      robotId: TEST_ROBOT_ID,
      locationId: TEST_LOCATION_ID,
      passId
    });

    const response = await fetch(`${API_BASE}/notes?${params}`, {
      method: 'DELETE'
    });
    assert(response.ok, `Cleanup failed for pass ${passId} with status ${response.status}`);
  }
  console.log('✓ Test data cleaned up');
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Notes API Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing against: ${API_BASE}`);
  console.log(`Organization: ${TEST_ORG_ID}`);
  console.log(`Robot: ${TEST_ROBOT_ID}`);
  console.log(`Location: ${TEST_LOCATION_ID}`);

  try {
    await testCreateNote();
    await testUpsertNotesForMultiplePasses();
    await testFetchNotes(2);
    await testDeleteAllNotes();
    await testFetchNotes(1);

    console.log('\n' + '='.repeat(60));
    console.log('All tests passed!');
    console.log('='.repeat(60));
    console.log('\nTo view data in MongoDB Atlas:');
    console.log('1. Go to https://cloud.mongodb.com/');
    console.log('2. Select your cluster');
    console.log('3. Click "Browse Collections"');
    console.log('4. Navigate to database:', process.env.MONGODB_DB || 'viking');
    console.log('5. Collection: sanding_notes');

    // cleanup
    const cleanup = process.argv.includes('--cleanup');
    if (cleanup) {
      await cleanupTestData();
    } else {
      console.log('\nNote: Test data left in database for inspection.');
      console.log('Run with --cleanup flag to remove test data.');
    }

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

runTests();
