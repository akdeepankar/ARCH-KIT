import assert from 'node:assert/strict';
import {emptyProject,newFloor,pointInRoom} from '../src/model.ts';
import {floorElevation,floorRise} from '../src/levelGeometry.ts';

// Helper function implementing the stair walk elevation & floor tracking logic from Scene.tsx
function simulateWalkStep(project, currentPos, state) {
  let matchedStair = null;
  for (let fi = 0; fi < project.floors.length; fi++) {
    const f = project.floors[fi], bElev = floorElevation(project, fi), rise = floorRise(f);
    for (const s of f.stairs) {
      const sUpper = s.to ? project.floors.findIndex(fl => fl.id === s.to) : fi + 1;
      const upperIdx = sUpper >= 0 && sUpper < project.floors.length ? sUpper : Math.min(fi + 1, project.floors.length - 1);
      if (currentPos.x >= s.x && currentPos.x <= s.x + s.w && currentPos.z >= s.y && currentPos.z <= s.y + s.d) {
        const rot = ((s.rotation || 0) % 360 + 360) % 360;
        const rawProgress = rot === 180 ? (currentPos.z - s.y) / s.d : rot === 90 ? (currentPos.x - s.x) / s.w : rot === 270 ? (s.x + s.w - currentPos.x) / s.w : (s.y + s.d - currentPos.z) / s.d;
        const progress = Math.max(0, Math.min(1, rawProgress));
        const stairElev = bElev + progress * rise;
        const isAlreadyOnThis = state.engagedStairId === s.id;
        const canEngage = isAlreadyOnThis || Math.abs(state.standingElev - stairElev) <= 3.5;
        if (canEngage) {
          matchedStair = { stair: s, floorIdx: fi, upperIdx, progress: rawProgress, elev: stairElev };
          break;
        }
      }
    }
    if (matchedStair) break;
  }

  if (matchedStair) {
    state.engagedStairId = matchedStair.stair.id;
    state.standingElev = matchedStair.elev;
    const nextFloorIdx = matchedStair.progress >= 0.5 ? matchedStair.upperIdx : matchedStair.floorIdx;
    state.currentFloorIdx = nextFloorIdx;
  } else {
    state.engagedStairId = null;
    state.standingElev = floorElevation(project, state.currentFloorIdx);
  }

  const activeFloor = project.floors[state.currentFloorIdx] || project.floors[0];
  state.activeFloorId = activeFloor.id;
  return state.standingElev;
}

// Set up 2-story building
const p = emptyProject();
p.plot.w = 50;
p.plot.d = 50;
const groundId = p.floors[0].id;
const upperFloor = newFloor('First Level');
p.floors.push(upperFloor);

const f0Rise = floorRise(p.floors[0]);
const f1Elev = floorElevation(p, 1);
assert.equal(f1Elev, f0Rise);
assert.ok(f1Elev > 9); // usually ~10.3 ft

// Add stair on ground floor with rotation 0 (ascending from z = 25 to z = 10)
// s.x = 10..13.5, s.y = 10..25, w = 3.5, d = 15
p.floors[0].stairs.push({
  id: 'stair-1',
  x: 10,
  y: 10,
  w: 3.5,
  d: 15,
  to: upperFloor.id,
  rotation: 0
});

// Test 1: Ascend from Ground to First Level and step onto the upper floor
const state = {
  currentFloorIdx: 0,
  standingElev: 0,
  engagedStairId: null,
  activeFloorId: groundId
};

// 1a. Approach stair on ground floor (z = 26, outside stair)
let elev = simulateWalkStep(p, { x: 11.75, z: 26 }, state);
assert.equal(elev, 0);
assert.equal(state.currentFloorIdx, 0);
assert.equal(state.engagedStairId, null);

// 1b. Step onto bottom of stair (z = 24.5, inside stair, rawProgress = (10+15-24.5)/15 = 0.5/15 = 0.033)
elev = simulateWalkStep(p, { x: 11.75, z: 24.5 }, state);
assert.ok(elev > 0 && elev < 1);
assert.equal(state.currentFloorIdx, 0);
assert.equal(state.engagedStairId, 'stair-1');

// 1c. Walk halfway up stair (z = 17.5, rawProgress = 0.5)
elev = simulateWalkStep(p, { x: 11.75, z: 17.5 }, state);
assert.equal(elev, f0Rise * 0.5);
assert.equal(state.currentFloorIdx, 1); // crossed halfway -> targets First Level
assert.equal(state.activeFloorId, upperFloor.id);

// 1d. Reach top of stair (z = 10.1, rawProgress ≈ 0.993)
elev = simulateWalkStep(p, { x: 11.75, z: 10.1 }, state);
assert.ok(Math.abs(elev - f1Elev) < 0.1);
assert.equal(state.currentFloorIdx, 1);

// 1e. STEP OFF the stair onto First Level (z = 9.5, outside stair!)
elev = simulateWalkStep(p, { x: 11.75, z: 9.5 }, state);
// MUST REMAIN AT FIRST LEVEL ELEVATION, NOT FALL TO GROUND!
assert.equal(elev, f1Elev);
assert.equal(state.currentFloorIdx, 1);
assert.equal(state.activeFloorId, upperFloor.id);
assert.equal(state.engagedStairId, null);

// 1f. Continue walking on First Level
elev = simulateWalkStep(p, { x: 11.75, z: 5.0 }, state);
assert.equal(elev, f1Elev);
assert.equal(state.currentFloorIdx, 1);

// Test 2: Descend from First Level back down to Ground Floor
// 2a. Walk back towards stair opening at z = 10.2
elev = simulateWalkStep(p, { x: 11.75, z: 10.2 }, state);
assert.equal(state.engagedStairId, 'stair-1');
assert.ok(Math.abs(elev - f1Elev) < 0.2);

// 2b. Walk down past halfway mark (z = 18.0, rawProgress = (25-18)/15 = 7/15 ≈ 0.467 < 0.5)
elev = simulateWalkStep(p, { x: 11.75, z: 18.0 }, state);
assert.equal(state.currentFloorIdx, 0); // switched back to Ground
assert.equal(state.activeFloorId, groundId);

// 2c. Step off the bottom onto Ground (z = 26.0)
elev = simulateWalkStep(p, { x: 11.75, z: 26.0 }, state);
assert.equal(elev, 0);
assert.equal(state.currentFloorIdx, 0);
assert.equal(state.activeFloorId, groundId);
assert.equal(state.engagedStairId, null);

// Test 3: Walking under the high end of the stair on Ground Floor does NOT teleport player up
const groundUnderneathState = {
  currentFloorIdx: 0,
  standingElev: 0,
  engagedStairId: null,
  activeFloorId: groundId
};
// Position at x = 11.75, z = 10.5 (near top of stair where elevation is ~10 ft)
elev = simulateWalkStep(p, { x: 11.75, z: 10.5 }, groundUnderneathState);
// Since ground is at 0 and stair at 10.5 is ~9.9 ft, |0 - 9.9| > 3.5, canEngage is false!
assert.equal(elev, 0);
assert.equal(groundUnderneathState.currentFloorIdx, 0);
assert.equal(groundUnderneathState.engagedStairId, null);

// Test 4: All 4 stair rotations (0, 90, 180, 270) correctly ascend and exit onto First Level
const rotations = [0, 90, 180, 270];
for (const rot of rotations) {
  const rotStair = {
    id: `stair-rot-${rot}`,
    x: 20,
    y: 20,
    w: (rot === 90 || rot === 270) ? 15 : 3.5,
    d: (rot === 90 || rot === 270) ? 3.5 : 15,
    to: upperFloor.id,
    rotation: rot
  };
  p.floors[0].stairs = [rotStair];

  const rotState = {
    currentFloorIdx: 0,
    standingElev: 0,
    engagedStairId: null,
    activeFloorId: groundId
  };

  // Determine bottom and top positions based on rotation
  let bottomPos, topPos, exitPos;
  if (rot === 0) {
    bottomPos = { x: 21.75, z: 34.5 };
    topPos = { x: 21.75, z: 20.5 };
    exitPos = { x: 21.75, z: 19.5 };
  } else if (rot === 180) {
    bottomPos = { x: 21.75, z: 20.5 };
    topPos = { x: 21.75, z: 34.5 };
    exitPos = { x: 21.75, z: 35.5 };
  } else if (rot === 90) {
    bottomPos = { x: 20.5, z: 21.75 };
    topPos = { x: 34.5, z: 21.75 };
    exitPos = { x: 35.5, z: 21.75 };
  } else if (rot === 270) {
    bottomPos = { x: 34.5, z: 21.75 };
    topPos = { x: 20.5, z: 21.75 };
    exitPos = { x: 19.5, z: 21.75 };
  }

  // Climb stair
  simulateWalkStep(p, bottomPos, rotState);
  assert.equal(rotState.engagedStairId, rotStair.id, `Failed to engage stair at rot ${rot}`);
  
  simulateWalkStep(p, topPos, rotState);
  assert.equal(rotState.currentFloorIdx, 1, `Failed to target floor 1 at top for rot ${rot}`);
  
  // Step off onto upper floor
  const exitElev = simulateWalkStep(p, exitPos, rotState);
  assert.equal(exitElev, f1Elev, `Failed to stay at upper elevation on exit for rot ${rot}`);
  assert.equal(rotState.currentFloorIdx, 1, `Wrong floor after exit for rot ${rot}`);
}

console.log('Stair walking multi-floor tests passed successfully!');
