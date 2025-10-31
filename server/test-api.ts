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
  console.log('Response:', response.status, result);

  if (response.ok) {
    console.log('✓ Note created successfully');
  } else {
    console.error('✗ Failed to create note');
  }
}

async function testCreateMultipleNotes() {
  console.log('\n2. Testing multiple notes for different passes...');

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
    console.log(`Pass ${note.pass_id}:`, response.status, await response.json());
  }
  console.log('✓ Multiple notes created');
}

async function testFetchNotes() {
  console.log('\n3. Testing GET /api/notes (Fetch Notes)...');

  const params = new URLSearchParams({
    organizationId: TEST_ORG_ID,
    robotId: TEST_ROBOT_ID,
    locationId: TEST_LOCATION_ID,
    passIds: `${TEST_PASS_ID_1},${TEST_PASS_ID_2}`
  });

  const response = await fetch(`${API_BASE}/notes?${params}`);
  const notes: PassNote[] = await response.json();

  console.log('Response:', response.status);
  console.log('Notes fetched:', notes.length);
  notes.forEach(note => {
    console.log(`  - Pass ${note.pass_id}: "${note.note_text}"`);
  });

  if (notes.length > 0) {
    console.log('✓ Notes fetched successfully');
  } else {
    console.log('⚠ No notes found');
  }
}

async function testDeleteOldNotes() {
  console.log('\n4. Testing DELETE /api/notes/old (Delete Old Notes)...');

  // First create multiple notes for the same pass
  console.log('Creating multiple notes for the same pass...');
  for (let i = 0; i < 3; i++) {
    await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: TEST_ORG_ID,
        location_id: TEST_LOCATION_ID,
        robot_id: TEST_ROBOT_ID,
        pass_id: TEST_PASS_ID_1,
        note_text: `Note version ${i + 1}`,
        created_by: 'test-script'
      })
    });
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const params = new URLSearchParams({
    organizationId: TEST_ORG_ID,
    robotId: TEST_ROBOT_ID,
    locationId: TEST_LOCATION_ID,
    passId: TEST_PASS_ID_1
  });

  const response = await fetch(`${API_BASE}/notes/old?${params}`, {
    method: 'DELETE'
  });

  const result = await response.json();
  console.log('Response:', response.status, result);
  console.log(`✓ Deleted ${result.deletedCount} old notes`);
}

async function testDeleteAllNotes() {
  console.log('\n5. Testing DELETE /api/notes (Delete All Notes for Pass)...');

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

    await fetch(`${API_BASE}/notes?${params}`, {
      method: 'DELETE'
    });
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
    await testCreateMultipleNotes();
    await testFetchNotes();
    await testDeleteOldNotes();
    await testDeleteAllNotes();
    await testFetchNotes(); // Verify deletion

    console.log('\n' + '='.repeat(60));
    console.log('All tests completed!');
    console.log('='.repeat(60));
    console.log('\nTo view data in MongoDB Atlas:');
    console.log('1. Go to https://cloud.mongodb.com/');
    console.log('2. Select your cluster');
    console.log('3. Click "Browse Collections"');
    console.log('4. Navigate to database:', process.env.MONGODB_DB || 'viking');
    console.log('5. Collection: sanding_notes');

    // Optional: cleanup
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
