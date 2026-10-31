import assert from 'node:assert/strict';
import {emptyProject,newFloor,uid,validate} from '../src/model.ts';
import {executeStairEdits} from '../src/editorActions.ts';
import {buildBuilding} from '../src/Building.ts';
import {floorElevation,floorRise} from '../src/levelGeometry.ts';
import * as THREE from 'three';

const p = emptyProject();
p.plot.w = 50;
p.plot.d = 50;
const ground = p.floors[0].id;
const upper = newFloor('Upper');
p.floors.push(upper);

// 1. Initial stair placement with executeStairEdits
let next = executeStairEdits(p, {
  edits: [{
    action: 'add',
    floorId: ground,
    x: 10,
    y: 10,
    width: 3.5,
    depth: 16,
    to: upper.id,
    rotation: 0
  }]
});

let stair = next.floors[0].stairs[0];
assert.equal(stair.rotation, 0);
assert.equal(stair.w, 3.5);
assert.equal(stair.d, 16);

// Proportions validation at 0 degrees: width 3.5 >= 3, run 16/18 >= 10/12
assert.equal(validate(next).some(f => f.message === 'Review stair proportions'), false);

// Narrow stair at 0 degrees produces warning
stair.w = 2.5;
assert.ok(validate(next).some(f => f.message === 'Review stair proportions'));
stair.w = 3.5;

// 2. Rotate 90 degrees: swaps w and d around center
next = executeStairEdits(next, {
  edits: [{
    action: 'update',
    floorId: ground,
    id: stair.id,
    rotation: 90
  }]
});

stair = next.floors[0].stairs[0];
assert.equal(stair.rotation, 90);
assert.equal(stair.w, 16, 'width along X is now the 16ft run');
assert.equal(stair.d, 3.5, 'depth along Y is now the 3.5ft stair width');
assert.equal(validate(next).some(f => f.message === 'Review stair proportions'), false);

// If horizontal stair has depth (stair width) < 3, warning triggers
stair.d = 2.5;
assert.ok(validate(next).some(f => f.message === 'Review stair proportions'));
stair.d = 3.5;

// 3. Rotate 270 degrees from 90 degrees: both are horizontal, so w and d are preserved
next = executeStairEdits(next, {
  edits: [{
    action: 'update',
    floorId: ground,
    id: stair.id,
    rotation: 270
  }]
});

stair = next.floors[0].stairs[0];
assert.equal(stair.rotation, 270);
assert.equal(stair.w, 16);
assert.equal(stair.d, 3.5);

// 4. Rotate to 180 degrees: switches to vertical, so w and d swap back
next = executeStairEdits(next, {
  edits: [{
    action: 'update',
    floorId: ground,
    id: stair.id,
    rotation: 180
  }]
});

stair = next.floors[0].stairs[0];
assert.equal(stair.rotation, 180);
assert.equal(stair.w, 3.5);
assert.equal(stair.d, 16);

// 5. Test 3D tread generation in Building.ts for all 4 orientations
const testOrientations = [0, 90, 180, 270];
for (const rot of testOrientations) {
  const isHoriz = rot === 90 || rot === 270;
  const project = structuredClone(p);
  project.floors[0].stairs = [{
    id: uid(),
    x: 10,
    y: 10,
    w: isHoriz ? 16 : 3.5,
    d: isHoriz ? 3.5 : 16,
    to: upper.id,
    rotation: rot
  }];

  const {group} = buildBuilding(project, false);
  const steps = group.children.filter(m => m.name === 'Stair tread');
  const rise = floorRise(project.floors[0]);
  const count = Math.ceil(rise / (7 / 12));
  assert.equal(steps.length, count, `Orientation ${rot} produces correct riser count`);

  // Max elevation of treads reaches upper floor elevation
  const maxStepY = Math.max(...steps.map(m => new THREE.Box3().setFromObject(m).max.y));
  assert.ok(Math.abs(maxStepY - floorElevation(project, 1)) < 1e-5, `Orientation ${rot} lands at upper level`);

  // First step (lowest) and last step (highest) positions
  const boxes = steps.map(m => new THREE.Box3().setFromObject(m));
  const lowestStep = boxes[0];
  const highestStep = boxes[boxes.length - 1];

  if (rot === 0) {
    // Climbs North (-Z): lowest is at south (larger Z), highest is at north (smaller Z)
    assert.ok(lowestStep.min.z > highestStep.min.z, 'rot 0 climbs North (-Z)');
  } else if (rot === 180) {
    // Climbs South (+Z): lowest is at north (smaller Z), highest is at south (larger Z)
    assert.ok(lowestStep.min.z < highestStep.min.z, 'rot 180 climbs South (+Z)');
  } else if (rot === 90) {
    // Climbs East (+X): lowest is at west (smaller X), highest is at east (larger X)
    assert.ok(lowestStep.min.x < highestStep.min.x, 'rot 90 climbs East (+X)');
  } else if (rot === 270) {
    // Climbs West (-X): lowest is at east (larger X), highest is at west (smaller X)
    assert.ok(lowestStep.min.x > highestStep.min.x, 'rot 270 climbs West (-X)');
  }
}

console.log('PASS: stair rotation handles 0/90/180/270 orientations, auto-swap dimensions, validation and 3D climb direction.');
