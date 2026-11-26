import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canOpen, inventoryTotals, workspaceFor } from '../src/demo.ts'

test('module visibility requires tenant membership, subscription and a staff grant', () => {
  const desk = workspaceFor('deskAgent', 'coast')
  assert.deepEqual(desk?.modules, ['pms', 'experiences'])
  assert.equal(canOpen(desk, ['operations']), false)
  assert.equal(canOpen(desk, ['loyalty']), false)
  assert.equal(workspaceFor('deskAgent', 'north'), null)
  assert.equal(workspaceFor('manager', '__proto__'), null)
  assert.equal(workspaceFor('constructor', 'north'), null)
  assert.equal(canOpen(null, ['platform']), false)
  assert.equal(canOpen(desk, ['settings']), false)
})

test('property grants and accepted route shapes are checked within the current tenant', () => {
  const coast = workspaceFor('manager', 'coast')
  const north = workspaceFor('manager', 'north')
  assert.equal(canOpen(coast, ['settings']), true)
  assert.equal(canOpen(north, ['settings']), false)
  assert.equal(canOpen(coast, ['pms', 'river', 'availability']), true)
  assert.equal(canOpen(coast, ['pms', 'grove']), false)
  assert.equal(canOpen(north, ['pms', 'grove']), true)
  assert.equal(canOpen(north, ['pms', 'river']), false)
  assert.equal(canOpen(workspaceFor('deskAgent', 'coast'), ['pms', 'river', 'front-desk']), false)
  assert.equal(canOpen(coast, ['pms', 'river', 'unknown']), false)
  assert.equal(canOpen(coast, ['pms', 'river', 'availability', 'extra']), false)
  assert.equal(canOpen(coast, ['experiences', 'extra']), false)
})

test('an Experiences-only tenant operates independently of PMS', () => {
  const kitchen = workspaceFor('host', 'kitchen')
  assert.deepEqual(kitchen?.modules, ['experiences'])
  assert.deepEqual(kitchen?.properties, [])
  assert.equal(canOpen(kitchen, ['experiences']), true)
  assert.equal(canOpen(kitchen, ['pms']), false)
})

test('portfolio occupancy is weighted by rooms in service and the empty case is defined', () => {
  const { properties } = workspaceFor('manager', 'coast')
  const portfolio = inventoryTotals(properties)
  assert.equal(portfolio.rooms, 106)
  assert.equal(portfolio.available, 24)
  assert.equal(portfolio.occupancy, 76 / 100)
  assert.equal(inventoryTotals([properties[0]]).occupancy, 48 / 60)
  assert.equal(inventoryTotals([]).occupancy, null)
})
